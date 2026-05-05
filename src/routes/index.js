const { createViewRoutes } = require('./viewRoutes');
const { createAuthRoutes } = require('./authRoutes');
const { createUserRoutes } = require('./userRoutes');

function createRoutes(controllers, middleware) {
  const { viewControllers, authControllers, userControllers } = controllers;
  const { rateLimiters, csrfProtection, uploadProfilePicture, profilePageLimiter } = middleware;

  const viewRoutes = createViewRoutes(viewControllers, profilePageLimiter);
  const authRoutes = createAuthRoutes(authControllers, rateLimiters, csrfProtection);
  const userRoutes = createUserRoutes(userControllers, rateLimiters.uploadLimiter, csrfProtection, uploadProfilePicture);

  return {
    viewRoutes,
    authRoutes,
    userRoutes,
  };
}

module.exports = { createRoutes };
