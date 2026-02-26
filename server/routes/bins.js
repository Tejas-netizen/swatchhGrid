const router = require('express').Router();
const { query } = require('../db');
const db = require('../db');
const { optimizeRoutes } = require('../routeOptimizer');
const { getLatestStatsObject } = require('../statsService');

let io;
const setIO = socketIo => {
  io = socketIo;
};

// GET all bins
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM bins ORDER BY priority_score DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bins:', err);
    res.status(500).json({ error: 'Failed to fetch bins' });
  }
});

// GET bin fill history
router.get('/:id/history', async (req, res) => {
  try {
    const result = await query(
      "SELECT fill_level, recorded_at FROM bin_history WHERE bin_id=$1 AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bin history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST override — mark bin critical, triggers reroute
router.post('/:id/override', async (req, res) => {
  try {
    const { fillLevel } = req.body;
    const status = fillLevel > 75 ? 'critical' : fillLevel > 40 ? 'high' : 'normal';
    const priority = fillLevel * 0.4 + (fillLevel > 75 ? 30 : 20) * 0.3;

    await query(
      'UPDATE bins SET fill_level=$1, status=$2, priority_score=$3 WHERE id=$4',
      [fillLevel, status, priority, req.params.id]
    );

    const bins = (await query('SELECT * FROM bins')).rows;
    if (io) io.emit('bin:update', { bins });

    const result = await optimizeRoutes(db);
    if (result && io) {
      io.emit('route:update', { routes: result.routes });

      // Optimizer updates stats table; broadcast latest snapshot
      const stats = await getLatestStatsObject(db);
      io.emit('stats:update', stats);

      io.emit('alert:new', {
        binId: req.params.id,
        message: 'Bin marked critical — routes updated',
        type: 'critical'
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error overriding bin:', err);
    res.status(500).json({ error: 'Failed to override bin' });
  }
});

// POST collected — truck reached bin, reset to green
router.post('/:id/collected', async (req, res) => {
  try {
    await query(
      "UPDATE bins SET fill_level=5, status='collected', priority_score=0 WHERE id=$1",
      [req.params.id]
    );

    await query(
      'UPDATE stats SET bins_collected = bins_collected + 1 WHERE id = (SELECT id FROM stats ORDER BY recorded_at DESC LIMIT 1)'
    );

    const bins = (await query('SELECT * FROM bins')).rows;
    if (io) {
      io.emit('bin:update', { bins });

      const stats = await getLatestStatsObject(db);
      io.emit('stats:update', stats);

      io.emit('alert:new', {
        binId: req.params.id,
        message: `Bin #${req.params.id} collected — reset to green`,
        type: 'collected'
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking bin collected:', err);
    res.status(500).json({ error: 'Failed to mark bin collected' });
  }
});

module.exports = { router, setIO };
