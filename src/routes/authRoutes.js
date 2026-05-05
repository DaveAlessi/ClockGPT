const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');

function createAuthRoutes(authControllers, rateLimiters, csrfProtection) {
  const router = express.Router();

  router.post('/api/registration', rateLimiters.registrationLimiter, csrfProtection, authControllers.register);
  router.post('/api/login', rateLimiters.loginLimiter, csrfProtection, authControllers.login);
  router.get('/api/csrf-token', csrfProtection, authControllers.getCsrfToken);
  router.post('/logout', ensureAuthenticated, csrfProtection, authControllers.logout);

  return router;
}

module.exports = { createAuthRoutes };
