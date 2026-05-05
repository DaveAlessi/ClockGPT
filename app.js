const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const {
  validateUsername,
  validateTimezone,
  validateRegistrationPassword,
} = require('./lib/validation');

function initUsersTable(db) {
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

function resolvePublicFilePath(publicDir, webPath) {
  const rel = String(webPath || '').replace(/^\//, '');
  return path.join(publicDir, rel);
}

/**
 * @param {object} options
 * @param {import('sqlite3').Database} options.db
 * @param {import('multer').Multer} options.upload
 * @param {string} [options.sessionSecret]
 * @param {string} options.publicDir - absolute path to `public` root (contains `images/` when using disk uploads)
 * @param {string} [options.viewsDir]
 * @param {boolean} [options.enableStatic]
 */
function createApp(options) {
  const {
    db,
    upload,
    sessionSecret = 'timezone-test-secret-key',
    publicDir = path.join(__dirname, 'public'),
    viewsDir = path.join(__dirname, 'views'),
    enableStatic = true,
  } = options;

  const app = express();

  if (enableStatic) {
    app.use(express.static(publicDir));
  }
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false },
    })
  );

  app.get('/', (req, res) => {
    res.sendFile(path.join(viewsDir, 'landing.html'));
  });

  app.get('/signin', (req, res) => {
    res.sendFile(path.join(viewsDir, 'signIn.html'));
  });

  app.get('/registration', (req, res) => {
    res.sendFile(path.join(viewsDir, 'registration.html'));
  });

  app.get('/profile', (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/signin');
    }
    res.sendFile(path.join(viewsDir, 'profile.html'));
  });

  app.post('/api/registration', async (req, res) => {
    const { username, password, timezone } = req.body;

    const userCheck = validateUsername(username);
    if (!userCheck.valid) {
      return res.status(400).json({ error: userCheck.error });
    }

    const tzCheck = validateTimezone(timezone);
    if (!tzCheck.valid) {
      return res.status(400).json({ error: tzCheck.error });
    }

    const passCheck = validateRegistrationPassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.error });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      db.run(
        'INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)',
        [username, passwordHash, timezone],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Registration failed' });
          }
          res.json({ success: true, userId: this.lastID });
        }
      );
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      try {
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.userId = user.id;
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Login failed' });
      }
    });
  });

  app.get('/api/user', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    db.get(
      'SELECT id, username, name, timezone, profile_picture FROM users WHERE id = ?',
      [req.session.userId],
      (err, user) => {
        if (err || !user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      }
    );
  });

  app.post('/api/user/update', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, timezone } = req.body;

    db.run(
      'UPDATE users SET name = ?, timezone = ? WHERE id = ?',
      [name, timezone, req.session.userId],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Update failed' });
        }
        res.json({ success: true });
      }
    );
  });

  app.post('/api/user/upload-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const picturePath = '/images/' + req.file.filename;

    db.get('SELECT profile_picture FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (user && user.profile_picture) {
        const oldPath = resolvePublicFilePath(publicDir, user.profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      db.run(
        'UPDATE users SET profile_picture = ? WHERE id = ?',
        [picturePath, req.session.userId],
        (err2) => {
          if (err2) {
            return res.status(500).json({ error: 'Upload failed' });
          }
          res.json({ success: true, profilePicture: picturePath });
        }
      );
    });
  });

  app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  return app;
}

module.exports = { createApp, initUsersTable };
