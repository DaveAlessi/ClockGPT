const { runAsync } = require('../repositories/dbHelpers');

module.exports = {
  version: '002',
  name: 'chat_tables',

  async up(db) {
    // Create conversations table
    await runAsync(db, `
      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create conversation_members table
    await runAsync(db, `
      CREATE TABLE conversation_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(conversation_id, user_id)
      )
    `);

    // Create messages table
    await runAsync(db, `
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        deleted_at DATETIME,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for query performance
    await runAsync(db, `
      CREATE INDEX idx_messages_conversation_created
      ON messages(conversation_id, created_at DESC)
    `);

    await runAsync(db, `
      CREATE INDEX idx_messages_deleted
      ON messages(deleted_at)
    `);

    await runAsync(db, `
      CREATE INDEX idx_conversation_members_user
      ON conversation_members(user_id)
    `);

    // Enable foreign keys for SQLite (needs to be set per connection)
    await runAsync(db, 'PRAGMA foreign_keys = ON');
  },

  async down(db) {
    // Drop indexes first
    await runAsync(db, 'DROP INDEX IF EXISTS idx_conversation_members_user');
    await runAsync(db, 'DROP INDEX IF EXISTS idx_messages_deleted');
    await runAsync(db, 'DROP INDEX IF EXISTS idx_messages_conversation_created');

    // Drop tables in reverse order (child tables first)
    await runAsync(db, 'DROP TABLE IF EXISTS messages');
    await runAsync(db, 'DROP TABLE IF EXISTS conversation_members');
    await runAsync(db, 'DROP TABLE IF EXISTS conversations');
  }
};
