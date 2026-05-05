const authService = require('../services/authService');
const sessionService = require('../services/sessionService');
const userRepository = require('../repositories/userRepository');

function createAuthControllers(db, bcryptRounds) {
  return {
    register: async (req, res) => {
      const { username, password, timezone, errors } = authService.validateRegistration(req.body || {});
      if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

      try {
        const passwordHash = await authService.hashPassword(password, bcryptRounds);
        const result = await userRepository.createUser(db, username, passwordHash, timezone);
        return res.json({ success: true, userId: result.id });
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }
    },

    login: async (req, res) => {
      const { username, password, errors } = authService.validateLogin(req.body || {});
      if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

      try {
        const user = await userRepository.getUserByUsername(db, username);
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await authService.comparePassword(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        await sessionService.regenerateSession(req);
        req.session.userId = user.id;
        return res.json({ success: true });
      } catch (_error) {
        return res.status(500).json({ error: 'Login failed' });
      }
    },

    getCsrfToken: (req, res) => {
      return res.json({ csrfToken: req.csrfToken() });
    },

    logout: async (req, res) => {
      try {
        await sessionService.destroySession(req);
        res.clearCookie('connect.sid');
        return res.json({ success: true });
      } catch (_error) {
        return res.status(500).json({ error: 'Logout failed' });
      }
    },
  };
}

module.exports = { createAuthControllers };
