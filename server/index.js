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
const { router: reportsRouter, setIO: setReportsIO } = require('./routes/reports');
const statsRouter = require('./routes/stats');
const predictRouter = require('./routes/predict');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' })); // large limit for base64 photos

app.get('/', (req, res) => {
  res.type('text').send(
    [
      'SwachhGrid backend is running.',
      '',
      'Use the dashboard at: http://localhost:3000',
      '',
      'API endpoints:',
      '- GET  /api/bins',
      '- POST /api/bins/:id/override',
      '- GET  /api/trucks',
      '- GET  /api/trucks/routes',
      '- GET  /api/reports',
      '- GET  /api/stats',
      '- POST /api/predict/:id'
    ].join('\n')
  );
});

app.use('/api/bins', binsRouter);
app.use('/api/trucks', trucksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/predict', predictRouter);

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

setBinsIO(io);
setReportsIO(io);

async function start() {
  // Initial route optimization on startup
  const result = await optimizeRoutes(db);
  if (result) {
    console.log(
      `✅ Initial routes: ${result.optimizedTotal.toFixed(
        1
      )}km optimized vs ${result.baselineTotal.toFixed(1)}km baseline`
    );
  }
  startSimulator(io);
  const port = process.env.PORT || 3001;
  server.listen(port, () =>
    console.log(`✅ SwachhGrid server on port ${port}`)
  );
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

