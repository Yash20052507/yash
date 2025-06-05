// PostgreSQL Migration Runner
// Usage: node dist/scripts/migrate.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') }); // Adjust path as needed
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const POSTGRES_URI = process.env.POSTGRES_URI;

if (!POSTGRES_URI) {
  console.error("Error: POSTGRES_URI is not defined in .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: POSTGRES_URI,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("Connected to PostgreSQL.");
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');

    console.log("Starting database migration...");
    await client.query(migrationSql);
    console.log("Database migration completed successfully.");

  } catch (err) {
    console.error("Error during database migration:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log("PostgreSQL connection closed.");
  }
}

runMigrations();
