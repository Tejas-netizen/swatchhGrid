const router = require('express').Router();
const { query } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM trucks');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching trucks:', err);
    res.status(500).json({ error: 'Failed to fetch trucks' });
  }
});

router.get('/routes', async (req, res) => {
  try {
    const result = await query(
      'SELECT r.*, t.name, t.color FROM routes r JOIN trucks t ON t.id = r.truck_id ORDER BY r.created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

module.exports = router;

