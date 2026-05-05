const logger = require('../lib/logger');

// Async handler wrapper to catch promise rejections
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Centralized error handler
function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error({
    err,
    method: req.method,
    path: req.path,
    userId: req.session?.userId,
  }, 'Request error');

  // CSRF errors (preserve existing behavior)
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Multer errors (preserve existing behavior)
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: `File size must be less than ${Math.floor(err.limit / (1024 * 1024))}MB`,
    });
  }

  // SQLite unique constraint violations (preserve existing behavior)
  if (err.message && err.message.includes('UNIQUE')) {
    return res.status(400).json({ error: 'Resource already exists' });
  }

  // Generic 500 error (don't leak internal details)
  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
}

module.exports = { asyncHandler, errorHandler };
