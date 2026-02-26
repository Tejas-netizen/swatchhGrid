# Phase 1 — Backend Foundation
## Tool: Any | Paste with: CONTEXT.md + PROGRESS.md

---

## Goal
Server running, DB connected, simulator ticking, APIs responding.
Zero UI in this phase. Test everything in browser/terminal.

## Ask Me For
`DATABASE_URL` (Neon PostgreSQL) before starting.

---

## Step 1 — Project + DB Setup

Create `server/` folder. Run:
```bash
npm init -y
npm install express socket.io pg dotenv node-cron cors @google/generative-ai
```

Create `server/db.js`:
```javascript
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10
});
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('DB Error:', err.message);
    throw err;
  }
};
module.exports = { pool, query };
```

Create `scripts/init-db.js` with these tables:
```sql
bins (id SERIAL PK, name VARCHAR(20), lat DECIMAL(10,7), lng DECIMAL(10,7), 
      zone VARCHAR(50), fill_level INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'normal',
      fill_rate DECIMAL(5,2) DEFAULT 2.0, citizen_reports INTEGER DEFAULT 0,
      priority_score DECIMAL(5,2) DEFAULT 0, last_collected TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW())

trucks (id SERIAL PK, name VARCHAR(20), current_lat DECIMAL(10,7), 
        current_lng DECIMAL(10,7), capacity INTEGER DEFAULT 100,
        current_load INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'active',
        assigned_zone VARCHAR(50), color VARCHAR(20) DEFAULT '#3b82f6')

routes (id SERIAL PK, truck_id INT REFERENCES trucks(id), bin_sequence JSONB,
        route_geojson JSONB, total_distance DECIMAL(10,2), created_at TIMESTAMP DEFAULT NOW())

bin_history (id SERIAL PK, bin_id INT REFERENCES bins(id), 
             fill_level INTEGER, recorded_at TIMESTAMP DEFAULT NOW())

reports (id SERIAL PK, bin_id INT REFERENCES bins(id), lat DECIMAL(10,7),
         lng DECIMAL(10,7), issue_type VARCHAR(50), description TEXT,
         photo_base64 TEXT, status VARCHAR(20) DEFAULT 'open',
         created_at TIMESTAMP DEFAULT NOW())

stats (id SERIAL PK, bins_collected INT DEFAULT 0, optimized_distance DECIMAL(10,2) DEFAULT 0,
       baseline_distance DECIMAL(10,2) DEFAULT 0, co2_saved DECIMAL(8,2) DEFAULT 0,
       overflow_prevented INT DEFAULT 0, recorded_at TIMESTAMP DEFAULT NOW())
```

Create `scripts/seed.js` with 30 bins across 3 Pune zones:
- Zone market (Shivajinagar, ~18.53°N 73.85°E): 10 bins, fill_rate 4.5, fill_levels 30-92
- Zone residential (Kothrud, ~18.51°N 73.81°E): 10 bins, fill_rate 1.5, fill_levels 15-70
- Zone transit (Hinjewadi, ~18.59°N 73.74°E): 10 bins, fill_rate 3.2, fill_levels 28-92
- 3 trucks: Truck-1 (#3b82f6 blue, market), Truck-2 (#f59e0b amber, residential), Truck-3 (#8b5cf6 purple, transit)
- Also seed bin_history: 24 data points per bin going back 12 minutes (for Gemini context)
- Insert 1 initial stats row

---

## Step 2 — Route Optimizer

Create `server/routeOptimizer.js`:

```javascript
// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Main optimizer — returns routes + GeoJSON per truck
async function optimizeRoutes(db) {
  const binsRes = await db.query('SELECT * FROM bins WHERE fill_level >= 60 OR status = $1 ORDER BY priority_score DESC', ['critical']);
  const trucksRes = await db.query('SELECT * FROM trucks');
  const bins = binsRes.rows;
  const trucks = trucksRes.rows;
  if (bins.length === 0) return null;

  // Greedy nearest-neighbor assignment
  const assignments = { 1: [], 2: [], 3: [] };
  const truckPositions = {};
  trucks.forEach(t => truckPositions[t.id] = { lat: parseFloat(t.current_lat), lng: parseFloat(t.current_lng) });
  const truckDistances = { 1: 0, 2: 0, 3: 0 };
  const assigned = new Set();

  for (const bin of bins) {
    if (assigned.has(bin.id)) continue;
    let bestTruck = null, bestDist = Infinity;
    for (const truck of trucks) {
      const pos = truckPositions[truck.id];
      const d = haversine(pos.lat, pos.lng, parseFloat(bin.lat), parseFloat(bin.lng));
      if (truckDistances[truck.id] + d < bestDist) {
        bestDist = truckDistances[truck.id] + d;
        bestTruck = truck.id;
      }
    }
    assignments[bestTruck].push(bin);
    truckDistances[bestTruck] += bestDist;
    truckPositions[bestTruck] = { lat: parseFloat(bin.lat), lng: parseFloat(bin.lng) };
    assigned.add(bin.id);
  }

  // Build GeoJSON LineStrings
  const routes = {};
  let optimizedTotal = 0, baselineTotal = 0;
  for (const truck of trucks) {
    const stopBins = assignments[truck.id];
    const coords = [[parseFloat(truck.current_lng), parseFloat(truck.current_lat)],
      ...stopBins.map(b => [parseFloat(b.lng), parseFloat(b.lat)])];
    routes[truck.id] = {
      truckId: truck.id, truckName: truck.name, color: truck.color,
      binIds: stopBins.map(b => b.id),
      geojson: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
      distance: truckDistances[truck.id]
    };
    optimizedTotal += truckDistances[truck.id];
  }

  // Baseline: sequential by ID
  for (let i = 0; i < bins.length - 1; i++) {
    baselineTotal += haversine(parseFloat(bins[i].lat), parseFloat(bins[i].lng),
      parseFloat(bins[i+1].lat), parseFloat(bins[i+1].lng));
  }

  // Save routes to DB
  for (const truck of trucks) {
    await db.query('DELETE FROM routes WHERE truck_id = $1', [truck.id]);
    await db.query(
      'INSERT INTO routes (truck_id, bin_sequence, route_geojson, total_distance) VALUES ($1, $2, $3, $4)',
      [truck.id, JSON.stringify(routes[truck.id].binIds), JSON.stringify(routes[truck.id].geojson), routes[truck.id].distance]
    );
  }

  const co2Saved = ((baselineTotal - optimizedTotal) * 0.21).toFixed(2);
  const fuelSaved = baselineTotal > 0 ? (((baselineTotal - optimizedTotal) / baselineTotal) * 100).toFixed(1) : 0;
  return { routes, optimizedTotal, baselineTotal, co2Saved, fuelSaved };
}

module.exports = { optimizeRoutes, haversine };
```

---

## Step 3 — Simulator

Create `server/simulator.js`:
```javascript
const cron = require('node-cron');
const { query } = require('./db');
const { optimizeRoutes } = require('./routeOptimizer');
const db = require('./db');

let tickCount = 0;
let io;

async function tick() {
  tickCount++;
  const bins = (await query('SELECT * FROM bins')).rows;
  const thresholdCrossed = [];

  for (const bin of bins) {
    if (bin.status === 'collected') continue;
    let newFill = Math.min(100, parseFloat(bin.fill_level) + parseFloat(bin.fill_rate));
    
    // Surge: every 10 ticks, randomly spike 2-3 market bins
    if (tickCount % 10 === 0 && bin.zone === 'market' && Math.random() < 0.3) {
      newFill = Math.min(100, newFill + 15);
    }

    const wasBelow80 = bin.fill_level < 80;
    const newStatus = newFill > 75 ? 'critical' : newFill > 40 ? 'high' : 'normal';
    const urgency = newFill > 75 ? 30 : newFill > 60 ? 20 : 10;
    const priority = (newFill * 0.4) + (bin.citizen_reports * 10 * 0.3) + (urgency * 0.3);

    await query(
      'UPDATE bins SET fill_level=$1, status=$2, priority_score=$3 WHERE id=$4',
      [Math.round(newFill), newStatus, priority.toFixed(2), bin.id]
    );
    await query('INSERT INTO bin_history (bin_id, fill_level) VALUES ($1, $2)', [bin.id, Math.round(newFill)]);

    if (wasBelow80 && newFill >= 80) thresholdCrossed.push(bin.id);
  }

  // Clean old history (keep 48hrs)
  await query("DELETE FROM bin_history WHERE recorded_at < NOW() - INTERVAL '48 hours'");

  const updatedBins = (await query('SELECT * FROM bins')).rows;
  io.emit('bin:update', { bins: updatedBins });

  // Re-optimize if any bin crossed 80%
  if (thresholdCrossed.length > 0) {
    const result = await optimizeRoutes(db);
    if (result) {
      io.emit('route:update', { routes: result.routes });
      thresholdCrossed.forEach(binId => {
        io.emit('alert:new', { binId, message: `Bin crossed 80% threshold`, type: 'critical' });
      });
    }
  }
}

function startSimulator(socketIo) {
  io = socketIo;
  cron.schedule('*/30 * * * * *', tick);
  console.log('✅ Simulator started (30s interval)');
}

module.exports = { startSimulator };
```

---

## Step 4 — API Routes

Create `server/routes/bins.js`:
```javascript
const router = require('express').Router();
const { query } = require('../db');
const db = require('../db');
const { optimizeRoutes } = require('../routeOptimizer');
let io;
const setIO = (socketIo) => { io = socketIo; };

router.get('/', async (req, res) => {
  const result = await query('SELECT * FROM bins ORDER BY priority_score DESC');
  res.json(result.rows);
});

router.get('/:id/history', async (req, res) => {
  const result = await query(
    "SELECT fill_level, recorded_at FROM bin_history WHERE bin_id=$1 AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at ASC",
    [req.params.id]
  );
  res.json(result.rows);
});

router.post('/:id/override', async (req, res) => {
  const { fillLevel } = req.body;
  const status = fillLevel > 75 ? 'critical' : fillLevel > 40 ? 'high' : 'normal';
  const priority = (fillLevel * 0.4) + (0) + (fillLevel > 75 ? 30 : 20) * 0.3;
  await query('UPDATE bins SET fill_level=$1, status=$2, priority_score=$3 WHERE id=$4',
    [fillLevel, status, priority, req.params.id]);
  const bins = (await query('SELECT * FROM bins')).rows;
  io.emit('bin:update', { bins });
  const result = await optimizeRoutes(db);
  if (result) {
    io.emit('route:update', { routes: result.routes });
    io.emit('alert:new', { binId: req.params.id, message: 'Bin marked critical — routes updated', type: 'critical' });
  }
  res.json({ success: true });
});

module.exports = { router, setIO };
```

Create `server/routes/trucks.js`:
```javascript
const router = require('express').Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  res.json((await query('SELECT * FROM trucks')).rows);
});

router.get('/routes', async (req, res) => {
  const result = await query('SELECT r.*, t.name, t.color FROM routes r JOIN trucks t ON t.id = r.truck_id ORDER BY r.created_at DESC');
  res.json(result.rows);
});

module.exports = router;
```

Create `server/routes/reports.js` — POST /api/report, GET /api/reports, PATCH /api/reports/:id. Store all fields, emit report:created via io, increment citizen_reports on associated bin if binId provided.

Create `server/routes/stats.js` — GET /api/stats returns latest stats row.

---

## Step 5 — Main Server

Create `server/index.js`:
```javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
const { startSimulator } = require('./simulator');
const { optimizeRoutes } = require('./routeOptimizer');
const { router: binsRouter, setIO: setBinsIO } = require('./routes/bins');
const trucksRouter = require('./routes/trucks');
const reportsRouter = require('./routes/reports');
const statsRouter = require('./routes/stats');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000', methods: ['GET','POST'] } });

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' })); // large limit for base64 photos

app.use('/api/bins', binsRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/stats', statsRouter);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

setBinsIO(io);

async function start() {
  // Initial route optimization on startup
  const result = await optimizeRoutes(db);
  if (result) console.log(`✅ Initial routes: ${result.optimizedTotal.toFixed(1)}km optimized vs ${result.baselineTotal.toFixed(1)}km baseline`);
  startSimulator(io);
  server.listen(process.env.PORT || 3001, () => console.log(`✅ SwachhGrid server on port ${process.env.PORT || 3001}`));
}

start().catch(console.error);
```

---

## Phase 1 Checkpoint — Verify All Before Saying Done

```bash
node scripts/init-db.js    # Should say "All tables created"
node scripts/seed.js       # Should say "Seed complete: 30 bins, 3 trucks"
node server/index.js       # Should say "server on port 3001"
```

Then verify in browser:
- `http://localhost:3001/api/bins` → 30 bins in JSON
- `http://localhost:3001/api/trucks` → 3 trucks
- Wait 30s → hit /api/bins again → fill_levels should have increased
- `POST http://localhost:3001/api/bins/4/override` body `{"fillLevel": 95}` → bin B-004 turns critical

Update PROGRESS.md. Mark Phase 1 DONE.
**Ask user to confirm before starting Phase 2.**
