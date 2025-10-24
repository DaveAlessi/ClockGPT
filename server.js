const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  cookie: { secure: false } // Set to true if using HTTPS
}));

// In-memory user storage (for testing only)
const users = {};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.post('/signin', (req, res) => {
  const { timezone } = req.body;
  
  // Create a new user session
  const userId = 'user-' + Date.now();
  req.session.userId = userId;
  
  // Initialize user data
  users[userId] = {
    name: '',
    timezone: timezone,
    profilePicture: ''
  };
  
  res.json({ success: true });
});

app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = users[req.session.userId] || {};
  res.json(user);
});

app.post('/api/user/update', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { name, timezone } = req.body;
  
  if (!users[req.session.userId]) {
    users[req.session.userId] = {};
  }
  
  if (name !== undefined) users[req.session.userId].name = name;
  if (timezone !== undefined) users[req.session.userId].timezone = timezone;
  
  res.json({ success: true, user: users[req.session.userId] });
});

app.post('/api/user/upload-picture', upload.single('profilePicture'), (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Delete old profile picture if exists
  if (users[req.session.userId]?.profilePicture) {
    const oldPath = path.join(__dirname, 'public', users[req.session.userId].profilePicture);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  
  const picturePath = '/images/' + req.file.filename;
  users[req.session.userId].profilePicture = picturePath;
  
  res.json({ success: true, profilePicture: picturePath });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌍 Timezone Test Application Running!`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop the server.\n`);
});
