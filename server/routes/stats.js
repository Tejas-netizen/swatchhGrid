const router = require('express').Router();
const { getLatestStatsObject } = require('../statsService');

router.get('/', async (req, res) => {
  try {
    const stats = await getLatestStatsObject();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

