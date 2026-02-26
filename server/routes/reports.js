const router = require('express').Router();
const { query } = require('../db');

let io;
const setIO = socketIo => {
  io = socketIo;
};

// Create report
router.post('/', async (req, res) => {
  try {
    const {
      binId,
      lat,
      lng,
      issue_type,
      description,
      photo_base64
    } = req.body;

    const result = await query(
      'INSERT INTO reports (bin_id, lat, lng, issue_type, description, photo_base64) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [binId || null, lat, lng, issue_type, description, photo_base64 || null]
    );

    if (binId) {
      await query(
        'UPDATE bins SET citizen_reports = citizen_reports + 1 WHERE id=$1',
        [binId]
      );
    }

    const report = result.rows[0];
    if (io) {
      io.emit('report:created', { report });
    }

    res.status(201).json(report);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// List reports
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM reports ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE reports SET status=$1 WHERE id=$2', [
      status,
      req.params.id
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

module.exports = { router, setIO };

