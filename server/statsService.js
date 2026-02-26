const { query } = require('./db');

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toStatsObject(row) {
  if (!row) {
    return {
      binsCollected: 0,
      fuelSaved: 0,
      co2Saved: 0,
      overflowPrevented: 0,
    };
  }

  const binsCollected = toNumber(row.bins_collected, 0);
  const optimized = toNumber(row.optimized_distance, 0);
  const baseline = toNumber(row.baseline_distance, 0);
  const co2Saved = toNumber(row.co2_saved, 0);
  const overflowPrevented = toNumber(row.overflow_prevented, 0);

  const fuelSaved =
    baseline > 0 ? ((baseline - optimized) / baseline) * 100 : 0;

  return {
    binsCollected,
    fuelSaved: Number(fuelSaved.toFixed(1)),
    co2Saved: Number(co2Saved.toFixed(2)),
    overflowPrevented,
  };
}

async function getLatestStatsObject(db = { query }) {
  const result = await db.query(
    'SELECT * FROM stats ORDER BY recorded_at DESC LIMIT 1'
  );
  return toStatsObject(result.rows[0] || null);
}

module.exports = { toStatsObject, getLatestStatsObject };

