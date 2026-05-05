const bcrypt = require('bcrypt');
const { TIMEZONE_LIST } = require('../lib/constants');

async function hashPassword(password, rounds) {
  return await bcrypt.hash(password, rounds);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function validateRegistration(payload) {
  const errors = [];
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const timezone = typeof payload.timezone === 'string' ? payload.timezone.trim() : '';

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }
  if (!password || password.length < 8 || password.length > 72) {
    errors.push('Password must be between 8 and 72 characters');
  }
  if (!timezone || !TIMEZONE_LIST.has(timezone)) {
    errors.push('Timezone is invalid');
  }

  return { username, password, timezone, errors };
}

function validateLogin(payload) {
  const errors = [];
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!username) errors.push('Username is required');
  if (!password) errors.push('Password is required');
  return { username, password, errors };
}

module.exports = {
  hashPassword,
  comparePassword,
  validateRegistration,
  validateLogin,
};
