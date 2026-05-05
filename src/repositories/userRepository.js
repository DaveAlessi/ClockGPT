const { runAsync, getAsync } = require('./dbHelpers');

async function createUser(db, username, passwordHash, timezone) {
  const result = await runAsync(
    db,
    'INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)',
    [username, passwordHash, timezone]
  );
  return { id: result.lastID };
}

async function getUserByUsername(db, username) {
  return await getAsync(db, 'SELECT * FROM users WHERE username = ?', [username]);
}

async function getUserById(db, userId) {
  return await getAsync(
    db,
    'SELECT id, username, name, timezone, profile_picture FROM users WHERE id = ?',
    [userId]
  );
}

async function updateUserProfile(db, userId, { name, timezone }) {
  await runAsync(
    db,
    'UPDATE users SET name = ?, timezone = ? WHERE id = ?',
    [name, timezone, userId]
  );
}

async function getUserProfilePicture(db, userId) {
  return await getAsync(db, 'SELECT profile_picture FROM users WHERE id = ?', [userId]);
}

async function updateUserProfilePicture(db, userId, picturePath) {
  await runAsync(
    db,
    'UPDATE users SET profile_picture = ? WHERE id = ?',
    [picturePath, userId]
  );
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  updateUserProfile,
  getUserProfilePicture,
  updateUserProfilePicture,
};
