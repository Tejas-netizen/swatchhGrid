require('dotenv').config({ path: '../server/.env' });
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function init() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS bins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20),
        lat DECIMAL(10,7),
        lng DECIMAL(10,7),
        zone VARCHAR(50),
        fill_level INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'normal',
        fill_rate DECIMAL(5,2) DEFAULT 2.0,
        citizen_reports INTEGER DEFAULT 0,
        priority_score DECIMAL(5,2) DEFAULT 0,
        last_collected TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trucks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20),
        current_lat DECIMAL(10,7),
        current_lng DECIMAL(10,7),
        capacity INTEGER DEFAULT 100,
        current_load INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        assigned_zone VARCHAR(50),
        color VARCHAR(20) DEFAULT '#3b82f6'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        truck_id INT REFERENCES trucks(id),
        bin_sequence JSONB,
        route_geojson JSONB,
        total_distance DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bin_history (
        id SERIAL PRIMARY KEY,
        bin_id INT REFERENCES bins(id),
        fill_level INTEGER,
        recorded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        bin_id INT REFERENCES bins(id),
        lat DECIMAL(10,7),
        lng DECIMAL(10,7),
        issue_type VARCHAR(50),
        description TEXT,
        photo_base64 TEXT,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        bins_collected INT DEFAULT 0,
        optimized_distance DECIMAL(10,2) DEFAULT 0,
        baseline_distance DECIMAL(10,2) DEFAULT 0,
        co2_saved DECIMAL(8,2) DEFAULT 0,
        overflow_prevented INT DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ All tables created');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

init();

