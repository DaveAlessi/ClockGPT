const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');

function createUserRoutes(userControllers, uploadLimiter, csrfProtection, uploadProfilePicture) {
  const router = express.Router();

  router.get('/api/user', ensureAuthenticated, userControllers.getUser);
  router.post('/api/user/update', ensureAuthenticated, csrfProtection, userControllers.updateProfile);
  router.post('/api/user/upload-picture', ensureAuthenticated, uploadLimiter, csrfProtection, uploadProfilePicture, userControllers.uploadPicture);

  return router;
}

module.exports = { createUserRoutes };
