const cron = require('node-cron');
const { query } = require('./db');
const { optimizeRoutes } = require('./routeOptimizer');
const { getLatestStatsObject } = require('./statsService');
const db = require('./db');

let tickCount = 0;
let io;
let liveTruckPositions = {};

async function tick() {
  tickCount++;
  const bins = (await query('SELECT * FROM bins')).rows;
  const thresholdCrossed = [];

  for (const bin of bins) {
    if (bin.status === 'collected') continue;
    let newFill = Math.min(
      100,
      parseFloat(bin.fill_level) + parseFloat(bin.fill_rate)
    );

    // Surge: every 10 ticks, randomly spike 2-3 market bins
    if (tickCount % 10 === 0 && bin.zone === 'market' && Math.random() < 0.3) {
      newFill = Math.min(100, newFill + 15);
    }

    const wasBelow80 = bin.fill_level < 80;
    const newStatus = newFill > 75 ? 'critical' : newFill > 40 ? 'high' : 'normal';
    const urgency = newFill > 75 ? 30 : newFill > 60 ? 20 : 10;
    const priority =
      newFill * 0.4 + bin.citizen_reports * 10 * 0.3 + urgency * 0.3;

    await query(
      'UPDATE bins SET fill_level=$1, status=$2, priority_score=$3 WHERE id=$4',
      [Math.round(newFill), newStatus, priority.toFixed(2), bin.id]
    );
    await query(
      'INSERT INTO bin_history (bin_id, fill_level) VALUES ($1, $2)',
      [bin.id, Math.round(newFill)]
    );

    if (wasBelow80 && newFill >= 80) thresholdCrossed.push(bin.id);
  }

  // Simulate truck collection every 2 ticks (1 min): each truck collects first full bin on its route
  if (tickCount % 2 === 0) {
    const routesRes = await query('SELECT truck_id, bin_sequence FROM routes');
    const trucksRes = await query('SELECT * FROM trucks');
    const trucksById = {};
    trucksRes.rows.forEach((t) => { trucksById[t.id] = t; });
    const binsById = {};
    (await query('SELECT * FROM bins')).rows.forEach((b) => { binsById[b.id] = b; });

    for (const row of routesRes.rows) {
      const truckId = row.truck_id;
      const truck = trucksById[truckId];
      if (!truck) continue;
      let binIds = row.bin_sequence;
      if (typeof binIds === 'string') {
        try { binIds = JSON.parse(binIds); } catch { binIds = []; }
      }
      if (!Array.isArray(binIds)) binIds = [];
      if (binIds.length === 0) continue;

      const firstFullBinId = binIds.find((id) => {
        const bin = binsById[id];
        return bin && Number(bin.fill_level) >= 50;
      });
      if (!firstFullBinId) continue;

      const capacity = Number(truck.capacity) || 100;
      let newLoad = Number(truck.current_load) || 0;
      newLoad += 10;
      if (newLoad >= capacity) newLoad = 0;

      await query(
        'UPDATE bins SET fill_level=5, status=$1, priority_score=0 WHERE id=$2',
        ['normal', firstFullBinId]
      );
      await query(
        'UPDATE trucks SET current_load=$1 WHERE id=$2',
        [newLoad, truckId]
      );
      await query(
        'UPDATE stats SET bins_collected = bins_collected + 1 WHERE id = (SELECT id FROM stats ORDER BY recorded_at DESC LIMIT 1)'
      );

      trucksById[truckId] = { ...truck, current_load: newLoad };
      binsById[firstFullBinId] = { ...binsById[firstFullBinId], fill_level: 5, status: 'normal' };
    }
  }

  // Clean old history (keep 48hrs)
  await query(
    "DELETE FROM bin_history WHERE recorded_at < NOW() - INTERVAL '48 hours'"
  );

  const updatedBins = (await query('SELECT * FROM bins')).rows;
  const updatedTrucks = (await query('SELECT * FROM trucks')).rows;
  io.emit('bin:update', { bins: updatedBins, trucks: updatedTrucks });

  // Re-optimize if any bin crossed 80%
  if (thresholdCrossed.length > 0) {
    const result = await optimizeRoutes(db, liveTruckPositions);
    if (result) {
      io.emit('route:update', { routes: result.routes });
      if (result.stats) io.emit('stats:update', result.stats);
      thresholdCrossed.forEach((binId) => {
        io.emit('alert:new', {
          binId,
          message: 'Bin crossed 80% threshold',
          type: 'critical'
        });
      });
    }
  } else if (tickCount % 2 === 0) {
    const stats = await getLatestStatsObject(db);
    io.emit('stats:update', stats);
  }
}

function startSimulator(socketIo, truckPositionsRef) {
  io = socketIo;
  if (truckPositionsRef) liveTruckPositions = truckPositionsRef;
  cron.schedule('*/30 * * * * *', tick);
  console.log('✅ Simulator started (30s interval)');
}

module.exports = { startSimulator };

