require('dotenv').config({ path: '../server/.env' });
const { Client } = require('pg');

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      TRUNCATE bin_history, routes, reports, stats, bins, trucks
      RESTART IDENTITY CASCADE
    `);

    await client.query(`
      INSERT INTO trucks (name, current_lat, current_lng, assigned_zone, color) VALUES
      ('Truck-1', 18.5195, 73.8553, 'market',      '#3b82f6'),
      ('Truck-2', 18.5072, 73.8148, 'residential', '#f59e0b'),
      ('Truck-3', 18.5912, 73.7382, 'transit',     '#8b5cf6')
    `);

    // fill_rate lowered: market 0.8, residential 0.3, transit 0.6
    // Bins now take ~15-20 mins to go from green to red
    await client.query(`
      INSERT INTO bins (name, lat, lng, zone, fill_level, status, fill_rate, citizen_reports, priority_score) VALUES
      ('B-M-01', 18.5195, 73.8553, 'market',      78, 'critical', 0.8, 0, 40.2),
      ('B-M-02', 18.5247, 73.8412, 'market',      45, 'high',     0.8, 0, 24.0),
      ('B-M-03', 18.5163, 73.8621, 'market',      88, 'critical', 0.7, 0, 44.2),
      ('B-M-04', 18.5312, 73.8489, 'market',      35, 'normal',   0.8, 0, 17.0),
      ('B-M-05', 18.5089, 73.8678, 'market',      92, 'critical', 0.7, 0, 45.8),
      ('B-M-06', 18.5278, 73.8334, 'market',      61, 'high',     0.8, 0, 30.4),
      ('B-M-07', 18.5421, 73.8523, 'market',      42, 'high',     0.6, 0, 22.8),
      ('B-M-08', 18.5134, 73.8756, 'market',      74, 'high',     0.8, 0, 35.6),
      ('B-M-09', 18.5367, 73.8267, 'market',      55, 'high',     0.7, 0, 28.0),
      ('B-M-10', 18.5056, 73.8489, 'market',      83, 'critical', 0.8, 0, 42.2),
      ('B-R-01', 18.5072, 73.8148, 'residential', 28, 'normal',   0.3, 0, 14.2),
      ('B-R-02', 18.4989, 73.8234, 'residential', 52, 'high',     0.3, 0, 26.8),
      ('B-R-03', 18.5145, 73.8067, 'residential', 18, 'normal',   0.3, 0,  9.2),
      ('B-R-04', 18.4934, 73.8312, 'residential', 65, 'high',     0.3, 0, 32.0),
      ('B-R-05', 18.5198, 73.7989, 'residential', 38, 'normal',   0.3, 0, 18.2),
      ('B-R-06', 18.4876, 73.8189, 'residential', 71, 'high',     0.3, 0, 34.4),
      ('B-R-07', 18.5034, 73.7923, 'residential', 22, 'normal',   0.3, 0, 11.8),
      ('B-R-08', 18.5267, 73.8078, 'residential', 44, 'high',     0.3, 0, 23.6),
      ('B-R-09', 18.4812, 73.8267, 'residential', 59, 'high',     0.3, 0, 29.6),
      ('B-R-10', 18.5156, 73.7856, 'residential', 31, 'normal',   0.3, 0, 15.4),
      ('B-T-01', 18.5912, 73.7382, 'transit',     67, 'high',     0.6, 0, 32.8),
      ('B-T-02', 18.5978, 73.7289, 'transit',     82, 'critical', 0.6, 0, 41.8),
      ('B-T-03', 18.5834, 73.7456, 'transit',     45, 'high',     0.5, 0, 24.0),
      ('B-T-04', 18.6045, 73.7423, 'transit',     91, 'critical', 0.6, 0, 45.4),
      ('B-T-05', 18.5756, 73.7534, 'transit',     33, 'normal',   0.5, 0, 16.2),
      ('B-T-06', 18.6112, 73.7312, 'transit',     76, 'critical', 0.6, 0, 39.4),
      ('B-T-07', 18.5689, 73.7623, 'transit',     58, 'high',     0.5, 0, 29.2),
      ('B-T-08', 18.6078, 73.7189, 'transit',     87, 'critical', 0.6, 0, 43.8),
      ('B-T-09', 18.5623, 73.7712, 'transit',     29, 'normal',   0.5, 0, 14.6),
      ('B-T-10', 18.6145, 73.7534, 'transit',     73, 'high',     0.6, 0, 35.2)
    `);

    // Bulk history insert
    const bins = await client.query('SELECT id, fill_level, fill_rate FROM bins ORDER BY id');
    const historyValues = [];
    const historyParams = [];
    let paramIdx = 1;

    for (const bin of bins.rows) {
      let level = parseFloat(bin.fill_level);
      for (let i = 24; i > 0; i--) {
        historyValues.push(`($${paramIdx++}, $${paramIdx++}, NOW() - ($${paramIdx++} || ' seconds')::interval)`);
        historyParams.push(bin.id, Math.max(0, Math.min(100, Math.round(level))), i * 30);
        level = Math.max(0, level - parseFloat(bin.fill_rate));
      }
    }

    await client.query(
      `INSERT INTO bin_history (bin_id, fill_level, recorded_at) VALUES ${historyValues.join(',')}`,
      historyParams
    );

    await client.query(`
      INSERT INTO stats (bins_collected, optimized_distance, baseline_distance, co2_saved, overflow_prevented)
      VALUES (7, 23.4, 31.2, 1.64, 3)
    `);

    console.log('✅ Seed complete: 30 bins (slow fill rates), 3 trucks, stats initialized');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

seed();