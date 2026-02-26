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

  // Clean old history (keep 48hrs)
  await query(
    "DELETE FROM bin_history WHERE recorded_at < NOW() - INTERVAL '48 hours'"
  );

  const updatedBins = (await query('SELECT * FROM bins')).rows;
  io.emit('bin:update', { bins: updatedBins });

  // Re-optimize if any bin crossed 80%
  if (thresholdCrossed.length > 0) {
    const result = await optimizeRoutes(db);
    if (result) {
      io.emit('route:update', { routes: result.routes });
      thresholdCrossed.forEach(binId => {
        io.emit('alert:new', {
          binId,
          message: 'Bin crossed 80% threshold',
          type: 'critical'
        });
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

