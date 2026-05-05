const { runAsync, getAsync, allAsync } = require('../repositories/dbHelpers');
const logger = require('../lib/logger');

async function ensureMigrationsTable(db) {
  await runAsync(db, `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(db) {
  const rows = await allAsync(db,
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  return rows.map(r => r.version);
}

async function applyMigration(db, migration) {
  const { version, name, up } = migration;

  // Check if already applied
  const existing = await getAsync(db,
    'SELECT version FROM schema_migrations WHERE version = ?',
    [version]
  );

  if (existing) {
    logger.info({ version, name }, 'Migration already applied');
    return false;
  }

  // Apply migration in transaction
  await new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', async (err) => {
      if (err) return reject(err);
      try {
        await up(db);
        await runAsync(db,
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [version, name]
        );
        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          logger.info({ version, name }, 'Migration applied successfully');
          resolve();
        });
      } catch (error) {
        db.run('ROLLBACK', () => {
          logger.error({ version, name, error }, 'Migration failed');
          reject(error);
        });
      }
    });
  });

  return true;
}

async function runMigrations(db) {
  await ensureMigrationsTable(db);

  // Import all migration files
  const migrations = [
    require('./001_baseline'),
    require('./002_chat_tables')
  ];

  let appliedCount = 0;
  for (const migration of migrations) {
    const applied = await applyMigration(db, migration);
    if (applied) appliedCount++;
  }

  if (appliedCount === 0) {
    logger.info('Database is up to date');
  } else {
    logger.info({ count: appliedCount }, 'Migrations completed');
  }
}

module.exports = { runMigrations, getAppliedMigrations, ensureMigrationsTable };
