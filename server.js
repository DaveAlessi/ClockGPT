const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const csurf = require('csurf');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const PORT = Number(process.env.PORT || 3000);
const DEFAULT_TIMEZONE = 'UTC';
const TIMEZONE_LIST = typeof Intl.supportedValuesOf === 'function'
  ? new Set(Intl.supportedValuesOf('timeZone'))
  : new Set(['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseBoolean(input, fallback) {
  if (input === undefined || input === null) return fallback;
  return String(input).toLowerCase() === 'true';
}

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

function closeDbAsync(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function initializeDatabase(db) {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    timezone TEXT,
    profile_picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
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

function validateProfile(payload) {
  const errors = [];
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const timezone = typeof payload.timezone === 'string' ? payload.timezone.trim() : '';

  if (!name || name.length > 80) {
    errors.push('Name must be 1-80 characters');
  }
  if (!timezone || !TIMEZONE_LIST.has(timezone)) {
    errors.push('Timezone is invalid');
  }
  return { name, timezone, errors };
}

function ensureAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return next();
}

function createApp(options = {}) {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET || 'dev-only-secret-change-me';
  const uploadDir = options.uploadDir || path.join(__dirname, 'public', 'images');
  const dbPath = options.dbPath || path.join(__dirname, 'users.db');
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
  const csrfProtection = csurf({ cookie: false });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: uploadMaxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!IMAGE_MIME_TYPES.has(file.mimetype) || !IMAGE_EXTENSIONS.has(ext)) {
        return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
      }
      return cb(null, true);
    }
  });

  function uploadProfilePicture(req, res, next) {
    upload.single('profilePicture')(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File size must be less than ${Math.floor(uploadMaxBytes / (1024 * 1024))}MB` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    });
  }

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
  });

  app.get('/signin', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signin.html'));
  });

  app.get('/registration', (_req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
  });

  app.get('/profile', profilePageLimiter, (req, res) => {
    if (!req.session.userId) return res.redirect('/signin');
    return res.sendFile(path.join(__dirname, 'views', 'profile.html'));
  });

  app.post('/api/registration', registrationLimiter, csrfProtection, async (req, res) => {
    const { username, password, timezone, errors } = validateRegistration(req.body || {});
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    try {
      const passwordHash = await bcrypt.hash(password, bcryptRounds);
      const result = await runAsync(
        db,
        'INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)',
        [username, passwordHash, timezone]
      );
      return res.json({ success: true, userId: result.lastID });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/login', loginLimiter, csrfProtection, async (req, res) => {
    const { username, password, errors } = validateLogin(req.body || {});
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    try {
      const user = await getAsync(db, 'SELECT * FROM users WHERE username = ?', [username]);
      if (!user) return res.status(401).json({ error: 'Invalid username or password' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid username or password' });

      await regenerateSession(req);
      req.session.userId = user.id;
      return res.json({ success: true });
    } catch (_error) {
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    return res.json({ csrfToken: req.csrfToken() });
  });

  app.get('/api/user', ensureAuthenticated, async (req, res) => {
    try {
      const user = await getAsync(
        db,
        'SELECT id, username, name, timezone, profile_picture FROM users WHERE id = ?',
        [req.session.userId]
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        timezone: user.timezone || DEFAULT_TIMEZONE,
        profilePicture: user.profile_picture
      });
    } catch (_error) {
      return res.status(500).json({ error: 'Failed to retrieve user' });
    }
  });

  app.post('/api/user/update', ensureAuthenticated, csrfProtection, async (req, res) => {
    const { name, timezone, errors } = validateProfile(req.body || {});
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    try {
      await runAsync(
        db,
        'UPDATE users SET name = ?, timezone = ? WHERE id = ?',
        [name, timezone, req.session.userId]
      );
      return res.json({ success: true });
    } catch (_error) {
      return res.status(500).json({ error: 'Update failed' });
    }
  });

  app.post('/api/user/upload-picture', ensureAuthenticated, uploadLimiter, csrfProtection, uploadProfilePicture, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const picturePath = `/images/${req.file.filename}`;

    try {
      const user = await getAsync(db, 'SELECT profile_picture FROM users WHERE id = ?', [req.session.userId]);
      if (user && user.profile_picture && user.profile_picture.startsWith('/images/')) {
        const oldFileName = path.basename(user.profile_picture);
        const oldPath = path.join(uploadDir, oldFileName);
        await fs.promises.unlink(oldPath).catch(() => {});
      }

      await runAsync(
        db,
        'UPDATE users SET profile_picture = ? WHERE id = ?',
        [picturePath, req.session.userId]
      );
      return res.json({ success: true, profilePicture: picturePath });
    } catch (_error) {
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/logout', ensureAuthenticated, csrfProtection, async (req, res) => {
    try {
      await destroySession(req);
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    } catch (_error) {
      return res.status(500).json({ error: 'Logout failed' });
    }
  });

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

if (require.main === module) {
  const { app } = createApp();
  app.listen(PORT, () => {
    console.log('\n🌍 Timezone Test Application Running!');
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server.\n');
  });
}

module.exports = {
  createApp
};