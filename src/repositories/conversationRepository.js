const { runAsync, getAsync, allAsync } = require('./dbHelpers');

async function createConversation(db) {
  const result = await runAsync(db,
    'INSERT INTO conversations DEFAULT VALUES'
  );
  return { id: result.lastID };
}

async function getConversationById(db, conversationId) {
  return await getAsync(db,
    'SELECT * FROM conversations WHERE id = ?',
    [conversationId]
  );
}

async function getConversationsByUserId(db, userId, limit = 50, offset = 0) {
  return await allAsync(db, `
    SELECT c.*, cm.joined_at
    FROM conversations c
    INNER JOIN conversation_members cm ON c.id = cm.conversation_id
    WHERE cm.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset]);
}

async function addMemberToConversation(db, conversationId, userId) {
  const result = await runAsync(db,
    'INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)',
    [conversationId, userId]
  );
  return { id: result.lastID };
}

async function getConversationMembers(db, conversationId) {
  return await allAsync(db, `
    SELECT u.id, u.username, u.name, cm.joined_at
    FROM conversation_members cm
    INNER JOIN users u ON cm.user_id = u.id
    WHERE cm.conversation_id = ?
  `, [conversationId]);
}

async function isUserMemberOfConversation(db, conversationId, userId) {
  const member = await getAsync(db,
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
    [conversationId, userId]
  );
  return !!member;
}

async function findConversationByMembers(db, userIds) {
  // For 1:1 chat: find conversation with exactly these two users
  if (userIds.length !== 2) {
    throw new Error('findConversationByMembers currently only supports 1:1 conversations');
  }

  const [userId1, userId2] = userIds.sort((a, b) => a - b);

  // Find conversations where both users are members
  const rows = await allAsync(db, `
    SELECT cm1.conversation_id
    FROM conversation_members cm1
    INNER JOIN conversation_members cm2
      ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = ? AND cm2.user_id = ?
  `, [userId1, userId2]);

  if (rows.length === 0) return null;

  // Verify it's exactly 2 members (no group chats mixed in)
  const conversationId = rows[0].conversation_id;
  const memberCount = await getAsync(db,
    'SELECT COUNT(*) as count FROM conversation_members WHERE conversation_id = ?',
    [conversationId]
  );

  if (memberCount.count === 2) {
    return await getConversationById(db, conversationId);
  }

  return null;
}

module.exports = {
  createConversation,
  getConversationById,
  getConversationsByUserId,
  addMemberToConversation,
  getConversationMembers,
  isUserMemberOfConversation,
  findConversationByMembers,
};
