const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const { DEFAULT_TIMEZONE } = require('./lib/constants');
const { closeDbAsync, initializeDatabase } = require('./repositories/dbHelpers');
const { createRateLimiters } = require('./middleware/rateLimits');
const { csrfProtection } = require('./middleware/csrf');
const { createUploadMiddleware } = require('./middleware/upload');
const { createViewControllers } = require('./controllers/viewController');
const { createAuthControllers } = require('./controllers/authController');
const { createUserControllers } = require('./controllers/userController');
const { createRoutes } = require('./routes');

function parseBoolean(input, fallback) {
  if (input === undefined || input === null) return fallback;
  return String(input).toLowerCase() === 'true';
}

function createApp(options = {}) {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET || 'dev-only-secret-change-me';
  const uploadDir = options.uploadDir || path.join(process.cwd(), 'public', 'images');
  const dbPath = options.dbPath || path.join(process.cwd(), 'users.db');
  const bcryptRounds = Number(options.bcryptRounds || process.env.BCRYPT_ROUNDS || 10);
  const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000);
  const secureCookie = options.cookieSecure ?? parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction);
  const sameSite = process.env.SESSION_COOKIE_SAMESITE || 'lax';
  const uploadMaxBytes = Number(options.uploadMaxBytes || process.env.UPLOAD_MAX_BYTES || 2 * 1024 * 1024);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const db = options.db || new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err);
      return;
    }
    console.log('Database connected');
  });
  initializeDatabase(db);

  app.disable('x-powered-by');
  app.use(express.static('public'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: secureCookie,
      httpOnly: true,
      sameSite,
      maxAge: sessionTtlMs
    }
  }));

  const { registrationLimiter, loginLimiter, uploadLimiter, profilePageLimiter } = createRateLimiters(options);
  const { uploadProfilePicture } = createUploadMiddleware(uploadDir, uploadMaxBytes);

  const viewControllers = createViewControllers(path.join(process.cwd(), 'views'));
  const authControllers = createAuthControllers(db, bcryptRounds);
  const userControllers = createUserControllers(db, uploadDir, DEFAULT_TIMEZONE);

  const routes = createRoutes(
    { viewControllers, authControllers, userControllers },
    { rateLimiters: { registrationLimiter, loginLimiter, uploadLimiter }, csrfProtection, uploadProfilePicture, profilePageLimiter }
  );

  app.use(routes.viewRoutes);
  app.use(routes.authRoutes);
  app.use(routes.userRoutes);

  app.use((err, _req, res, next) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return next(err);
  });

  return {
    app,
    db,
    close: () => closeDbAsync(db)
  };
}

module.exports = {
  createApp
};
