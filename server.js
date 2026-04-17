const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createApp, initUsersTable } = require('./app');

const PORT = 3000;
const publicDir = path.join(__dirname, 'public');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(publicDir, 'images'));
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected');
    initUsersTable(db);
  }
});

const app = createApp({
  db,
  upload,
  sessionSecret: 'timezone-test-secret-key',
  publicDir,
});

app.listen(PORT, () => {
  console.log(`\n🌍 Timezone Test Application Running!`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`\nPress Ctrl+C to stop the server.\n`);
});
