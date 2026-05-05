#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { runMigrations, getAppliedMigrations, ensureMigrationsTable } = require('../migrations');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'users.db');
const showStatus = process.argv.includes('--status');

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }

  try {
    if (showStatus) {
      await ensureMigrationsTable(db);
      const applied = await getAppliedMigrations(db);
      console.log('Applied migrations:');
      if (applied.length === 0) {
        console.log('  (none)');
      } else {
        applied.forEach(v => console.log(`  - ${v}`));
      }
    } else {
      await runMigrations(db);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
});
