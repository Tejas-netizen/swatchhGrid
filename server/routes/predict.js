const router = require('express').Router();
const { query } = require('../db');

// Placeholder prediction (no Gemini yet)
// We treat each simulator tick (30s) as ~30 minutes "real world" time for demo friendliness.
router.post('/:id', async (req, res) => {
  try {
    const binRes = await query('SELECT * FROM bins WHERE id=$1', [req.params.id]);
    const bin = binRes.rows[0];
    if (!bin) return res.status(404).json({ error: 'Bin not found' });

    // Normalize inputs and guard against NaN
    const rawFill = Number(bin.fill_level);
    const fill = Number.isFinite(rawFill) ? Math.min(Math.max(rawFill, 0), 100) : 0;

    const rawRate = Number(bin.fill_rate ?? 1);
    const ratePerTick = Math.max(0.1, Number.isFinite(rawRate) ? rawRate : 1);

    const remaining = Math.max(0, 100 - fill);
    const ticksToOverflow = remaining / ratePerTick;
    const hoursUntilOverflow = ticksToOverflow * 0.5; // 30 minutes per tick

    const confidence = fill > 80 ? 'high' : fill > 60 ? 'medium' : 'low';
    const recommendation =
      hoursUntilOverflow < 1
        ? 'Dispatch immediately to prevent overflow.'
        : hoursUntilOverflow < 3
        ? 'Prioritize this bin in the next routing cycle.'
        : 'Monitor — not urgent yet.';

    res.json({ hoursUntilOverflow, confidence, recommendation });
  } catch (err) {
    console.error('Predict error:', err);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

module.exports = router;

