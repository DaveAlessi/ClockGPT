const express = require('express');

function createViewRoutes(viewControllers, profilePageLimiter) {
  const router = express.Router();

  router.get('/', viewControllers.renderLanding);
  router.get('/signin', viewControllers.renderSignIn);
  router.get('/registration', viewControllers.renderRegistration);
  router.get('/profile', profilePageLimiter, viewControllers.renderProfile);

  return router;
}

module.exports = { createViewRoutes };
