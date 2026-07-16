const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = 'D:\\coding\\Guru Cerdas\\.env';
let dbUrl = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SUPABASE_DB_URL=(.+)/);
  if (match) {
    dbUrl = match[1].trim();
  } else {
    console.error('SUPABASE_DB_URL not found in .env');
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to read .env file', err);
  process.exit(1);
}

const migrationFiles = [
  'D:\\coding\\Guru Cerdas\\supabase\\migrations\\20260715200000_create_ai_insights.sql',
  'D:\\coding\\Guru Cerdas\\supabase\\migrations\\20260716000000_create_ai_generation_queue.sql'
];

console.log('Connecting to database...');
const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    for (const file of migrationFiles) {
      console.log(`\nReading migration: ${path.basename(file)}...`);
      const sql = fs.readFileSync(file, 'utf8');
      
      console.log(`Running migration: ${path.basename(file)}...`);
      const res = await client.query(sql);
      console.log(`Migration successful for ${path.basename(file)}!`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

run();
