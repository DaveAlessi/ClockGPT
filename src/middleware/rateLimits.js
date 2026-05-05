const { rateLimit } = require('express-rate-limit');

function createRateLimiters(options = {}) {
  const registrationLimiter = rateLimit({
    windowMs: Number(options.rateLimitWindowMs || 15 * 60 * 1000),
    max: Number(options.registrationRateLimitMax || 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many registration attempts. Please try again later.' }
  });

  const loginLimiter = rateLimit({
    windowMs: Number(options.rateLimitWindowMs || 15 * 60 * 1000),
    max: Number(options.loginRateLimitMax || 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' }
  });

  const uploadLimiter = rateLimit({
    windowMs: Number(options.uploadRateLimitWindowMs || 15 * 60 * 1000),
    max: Number(options.uploadRateLimitMax || 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload attempts. Please try again later.' }
  });

  const profilePageLimiter = rateLimit({
    windowMs: Number(options.profilePageRateLimitWindowMs || 15 * 60 * 1000),
    max: Number(options.profilePageRateLimitMax || 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  });

  return {
    registrationLimiter,
    loginLimiter,
    uploadLimiter,
    profilePageLimiter,
  };
}

module.exports = { createRateLimiters };
