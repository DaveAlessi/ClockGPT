const { runAsync, getAsync, allAsync } = require('./dbHelpers');

async function createMessage(db, conversationId, senderId, content) {
  const result = await runAsync(db,
    'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
    [conversationId, senderId, content]
  );
  return { id: result.lastID };
}

async function getMessageById(db, messageId) {
  return await getAsync(db, `
    SELECT m.*, u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `, [messageId]);
}

async function getMessagesByConversation(db, conversationId, limit = 50, offset = 0) {
  return await allAsync(db, `
    SELECT m.*, u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `, [conversationId, limit, offset]);
}

async function updateMessageContent(db, messageId, newContent) {
  await runAsync(db, `
    UPDATE messages
    SET content = ?, edited_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newContent, messageId]);
}

async function softDeleteMessage(db, messageId) {
  await runAsync(db,
    'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
    [messageId]
  );
}

async function getMessagesAfter(db, conversationId, afterId, limit = 100) {
  return await allAsync(db, `
    SELECT m.*, u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? AND m.id > ? AND m.deleted_at IS NULL
    ORDER BY m.created_at ASC
    LIMIT ?
  `, [conversationId, afterId, limit]);
}

async function getMessageCount(db, conversationId) {
  const result = await getAsync(db,
    'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND deleted_at IS NULL',
    [conversationId]
  );
  return result.count;
}

module.exports = {
  createMessage,
  getMessageById,
  getMessagesByConversation,
  updateMessageContent,
  softDeleteMessage,
  getMessagesAfter,
  getMessageCount,
};
