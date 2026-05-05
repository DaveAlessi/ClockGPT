const { runAsync } = require('../repositories/dbHelpers');

module.exports = {
  version: '001',
  name: 'baseline',

  async up(db) {
    // Create users table exactly as it exists in current schema
    await runAsync(db, `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        timezone TEXT,
        profile_picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },

  async down(db) {
    // Cannot rollback baseline migration
    throw new Error('Cannot rollback baseline migration');
  }
};
