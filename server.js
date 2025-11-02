const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Configure file upload storage 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Middleware 
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'timezone-test-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true when using HTTPS in production
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Simple CSRF protection middleware using Origin/Referer validation for state-changing requests
function csrfProtection(req, res, next) {
  const unsafeMethod = /^(POST|PUT|DELETE|PATCH)$/i.test(req.method);
  if (!unsafeMethod) return next();

  const host = req.headers.host;
  const expectedOrigin = `${req.protocol}://${host}`;

  const origin = req.headers.origin;
  if (origin && origin === expectedOrigin) {
    return next();
  }

  const referer = req.headers.referer;
  if (referer && referer.startsWith(expectedOrigin + '/')) {
    return next();
  }

  return res.status(403).json({ error: 'Invalid CSRF token' });
}

app.use(csrfProtection);

// Database setup
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Database connected');
        // Create users table
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
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signin.html'));
});

app.get('/registration', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/signin');
    }
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Registration API
app.post('/api/registration', async (req, res) => {
    const { username, password, timezone } = req.body;
    
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)',
            [username, passwordHash, timezone],
            function(err) {
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

// Login API
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

// Get user data
app.get('/api/user', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    db.get('SELECT id, username, name, timezone, profile_picture FROM users WHERE id = ?', 
        [req.session.userId], 
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        }
    );
});

// Update user profile
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

// Upload profile picture
app.post('/api/user/upload-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const picturePath = '/images/' + req.file.filename;
    
    // Get old picture path to delete it
    db.get('SELECT profile_picture FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (user && user.profile_picture) {
            const oldPath = path.join(__dirname, 'public', user.profile_picture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        
        // Update database with new picture
        db.run(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [picturePath, req.session.userId],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Upload failed' });
                }
                res.json({ success: true, profilePicture: picturePath });
            }
        );
    });
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌍 Timezone Test Application Running!`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop the server.\n`);
});
