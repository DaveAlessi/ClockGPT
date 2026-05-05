#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { runMigrations } = require('../migrations');
const { runAsync } = require('../repositories/dbHelpers');
const { createUser } = require('../repositories/userRepository');
const { createConversation, addMemberToConversation } = require('../repositories/conversationRepository');
const { createMessage } = require('../repositories/messageRepository');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'users.db');
const shouldReset = process.argv.includes('--reset');

async function clearData(db) {
  console.log('Clearing existing data...');
  await runAsync(db, 'DELETE FROM messages');
  await runAsync(db, 'DELETE FROM conversation_members');
  await runAsync(db, 'DELETE FROM conversations');
  await runAsync(db, 'DELETE FROM users');
  console.log('Data cleared');
}

async function seedDatabase(db) {
  console.log('Seeding database...');

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 4);

  const alice = await createUser(db, 'alice', passwordHash, 'America/New_York');
  const bob = await createUser(db, 'bob', passwordHash, 'America/Los_Angeles');
  const charlie = await createUser(db, 'charlie', passwordHash, 'Europe/London');

  console.log(`Created users: alice (${alice.id}), bob (${bob.id}), charlie (${charlie.id})`);

  // Create conversations
  const conv1 = await createConversation(db);
  await addMemberToConversation(db, conv1.id, alice.id);
  await addMemberToConversation(db, conv1.id, bob.id);

  const conv2 = await createConversation(db);
  await addMemberToConversation(db, conv2.id, alice.id);
  await addMemberToConversation(db, conv2.id, charlie.id);

  console.log(`Created conversations: ${conv1.id}, ${conv2.id}`);

  // Create messages
  await createMessage(db, conv1.id, alice.id, 'Hi Bob! How are you?');
  await createMessage(db, conv1.id, bob.id, 'Hey Alice! I\'m doing great, thanks!');
  await createMessage(db, conv1.id, alice.id, 'That\'s wonderful to hear!');

  await createMessage(db, conv2.id, charlie.id, 'Good morning Alice!');
  await createMessage(db, conv2.id, alice.id, 'Morning Charlie!');

  console.log('Created sample messages');
  console.log('\nSeed data summary:');
  console.log('- 3 users (alice, bob, charlie) with password: password123');
  console.log('- 2 conversations (alice-bob, alice-charlie)');
  console.log('- 5 messages');
}

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }

  try {
    // Run migrations first
    await runMigrations(db);

    if (shouldReset) {
      await clearData(db);
    }

    await seedDatabase(db);
    console.log('\nSeeding complete!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
});
