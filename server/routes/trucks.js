const router = require('express').Router();
const { query } = require('../db');

let liveTruckPositions = {};

function setLiveTruckPositions(ref) {
  liveTruckPositions = ref;
}

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

router.post('/:id/position', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const id = Number(req.params.id);
    liveTruckPositions[id] = { lat: Number(lat), lng: Number(lng) };
    await query(
      'UPDATE trucks SET current_lat=$1, current_lng=$2 WHERE id=$3',
      [Number(lat), Number(lng), id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating truck position:', err);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

module.exports = { router, setLiveTruckPositions };

