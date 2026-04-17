const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { createApp, initUsersTable } = require('../../app');

function createTestHarness() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clockgpt-test-'));
  const publicDir = tmpRoot;
  fs.mkdirSync(path.join(publicDir, 'images'), { recursive: true });

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

  const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
      console.error('Error opening test database', err);
    } else {
      initUsersTable(db);
    }
  });

  const app = createApp({
    db,
    upload,
    sessionSecret: 'test-secret-key',
    publicDir,
    viewsDir: path.join(__dirname, '../../views'),
    enableStatic: false,
  });

  return { app, db, tmpRoot };
}

describe('API Integration Tests', () => {
  let app;
  let db;
  let tmpRoot;

  beforeEach(() => {
    const harness = createTestHarness();
    app = harness.app;
    db = harness.db;
    tmpRoot = harness.tmpRoot;
  });

  afterEach((done) => {
    const cleanupFs = () => {
      if (tmpRoot) {
        try {
          fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    };
    if (db) {
      db.close((err) => {
        cleanupFs();
        done(err);
      });
    } else {
      cleanupFs();
      done();
    }
  });

  describe('POST /api/registration', () => {
    test('should successfully register a new user', async () => {
      const response = await request(app).post('/api/registration').send({
        username: 'testuser',
        password: 'password123',
        timezone: 'America/New_York',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
    });

    test('should fail when username already exists', async () => {
      await request(app).post('/api/registration').send({
        username: 'testuser',
        password: 'password123',
        timezone: 'America/New_York',
      });

      const response = await request(app).post('/api/registration').send({
        username: 'testuser',
        password: 'password456',
        timezone: 'Europe/London',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    test('should hash the password before storing', async () => {
      const password = 'mySecretPassword';
      await request(app).post('/api/registration').send({
        username: 'secureuser',
        password,
        timezone: 'Asia/Tokyo',
      });

      await new Promise((resolve, reject) => {
        db.get(
          'SELECT password_hash FROM users WHERE username = ?',
          ['secureuser'],
          (err, user) => {
            if (err) reject(err);
            else {
              expect(user.password_hash).not.toBe(password);
              expect(user.password_hash.length).toBeGreaterThan(20);
              resolve();
            }
          }
        );
      });
    });

    test('should reject invalid username', async () => {
      const response = await request(app).post('/api/registration').send({
        username: 'ab',
        password: 'password123',
        timezone: 'America/New_York',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/username/i);
    });

    test('should reject short password', async () => {
      const response = await request(app).post('/api/registration').send({
        username: 'validuser',
        password: 'short',
        timezone: 'America/New_York',
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/password/i);
    });

    test('should reject invalid timezone', async () => {
      const response = await request(app).post('/api/registration').send({
        username: 'validuser',
        password: 'password123',
        timezone: 'Not/A_Real_Zone_Xyz',
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid timezone');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/registration').send({
        username: 'loginuser',
        password: 'password123',
        timezone: 'America/Los_Angeles',
      });
    });

    test('should successfully login with correct credentials', async () => {
      const response = await request(app).post('/api/login').send({
        username: 'loginuser',
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should fail with incorrect password', async () => {
      const response = await request(app).post('/api/login').send({
        username: 'loginuser',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    test('should fail with non-existent username', async () => {
      const response = await request(app).post('/api/login').send({
        username: 'nonexistent',
        password: 'password123',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });
  });

  describe('GET /api/user', () => {
    test('should return user data when authenticated', async () => {
      const agent = request.agent(app);

      await agent.post('/api/registration').send({
        username: 'getuser',
        password: 'password123',
        timezone: 'Europe/Paris',
      });

      await agent.post('/api/login').send({
        username: 'getuser',
        password: 'password123',
      });

      const response = await agent.get('/api/user');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'getuser');
      expect(response.body).toHaveProperty('timezone', 'Europe/Paris');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    test('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/user');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    test('should return 404 when session user row is missing', async () => {
      const agent = request.agent(app);
      await agent.post('/api/registration').send({
        username: 'ghostuser',
        password: 'password123',
        timezone: 'Pacific/Honolulu',
      });
      await agent.post('/api/login').send({
        username: 'ghostuser',
        password: 'password123',
      });
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE username = ?', ['ghostuser'], (err) =>
          err ? reject(err) : resolve()
        );
      });
      const response = await agent.get('/api/user');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('POST /api/user/update', () => {
    test('should successfully update user profile', async () => {
      const agent = request.agent(app);

      await agent.post('/api/registration').send({
        username: 'updateuser',
        password: 'password123',
        timezone: 'America/New_York',
      });

      await agent.post('/api/login').send({
        username: 'updateuser',
        password: 'password123',
      });

      const response = await agent.post('/api/user/update').send({
        name: 'John Doe',
        timezone: 'Europe/London',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const userResponse = await agent.get('/api/user');
      expect(userResponse.body).toHaveProperty('name', 'John Doe');
      expect(userResponse.body).toHaveProperty('timezone', 'Europe/London');
    });

    test('should fail when not authenticated', async () => {
      const response = await request(app).post('/api/user/update').send({
        name: 'John Doe',
        timezone: 'Europe/London',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('POST /api/user/upload-picture', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/user/upload-picture')
        .attach('profilePicture', Buffer.from('fake'), 'photo.png');

      expect(response.status).toBe(401);
    });

    test('should return 400 when no file', async () => {
      const agent = request.agent(app);
      await agent.post('/api/registration').send({
        username: 'picuser',
        password: 'password123',
        timezone: 'Asia/Singapore',
      });
      await agent.post('/api/login').send({
        username: 'picuser',
        password: 'password123',
      });

      const response = await agent.post('/api/user/upload-picture');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    test('should upload file and persist profile_picture', async () => {
      const agent = request.agent(app);
      await agent.post('/api/registration').send({
        username: 'uploaduser',
        password: 'password123',
        timezone: 'Australia/Sydney',
      });
      await agent.post('/api/login').send({
        username: 'uploaduser',
        password: 'password123',
      });

      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);

      const response = await agent
        .post('/api/user/upload-picture')
        .attach('profilePicture', png, 'tiny.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profilePicture).toMatch(/^\/images\//);

      const rel = response.body.profilePicture.replace(/^\//, '');
      const abs = path.join(tmpRoot, rel);
      expect(fs.existsSync(abs)).toBe(true);

      const user = await agent.get('/api/user');
      expect(user.body.profile_picture).toBe(response.body.profilePicture);
    });

    test('should remove previous image file on second upload', async () => {
      const agent = request.agent(app);
      await agent.post('/api/registration').send({
        username: 'twopic',
        password: 'password123',
        timezone: 'America/New_York',
      });
      await agent.post('/api/login').send({
        username: 'twopic',
        password: 'password123',
      });

      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82,
      ]);

      const first = await agent.post('/api/user/upload-picture').attach('profilePicture', png, 'a.png');
      const firstPath = path.join(tmpRoot, first.body.profilePicture.replace(/^\//, ''));
      expect(fs.existsSync(firstPath)).toBe(true);

      await agent.post('/api/user/upload-picture').attach('profilePicture', png, 'b.png');
      expect(fs.existsSync(firstPath)).toBe(false);
    });
  });

  describe('HTML page routes', () => {
    test('GET / serves landing.html', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toMatch(/timezone|Timezone/i);
    });

    test('GET /signin serves signIn.html', async () => {
      const res = await request(app).get('/signin');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toMatch(/sign|password/i);
    });

    test('GET /registration serves registration.html', async () => {
      const res = await request(app).get('/registration');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toMatch(/register|timezone/i);
    });

    test('GET /profile redirects to signin when not logged in', async () => {
      const res = await request(app).get('/profile');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/signin');
    });

    test('GET /profile serves profile.html when authenticated', async () => {
      const agent = request.agent(app);
      await agent.post('/api/registration').send({
        username: 'pageuser',
        password: 'password123',
        timezone: 'Europe/London',
      });
      await agent.post('/api/login').send({
        username: 'pageuser',
        password: 'password123',
      });
      const res = await agent.get('/profile');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toMatch(/profile|timezone/i);
    });
  });

  describe('POST /logout', () => {
    test('should successfully logout user', async () => {
      const agent = request.agent(app);

      await agent.post('/api/registration').send({
        username: 'logoutuser',
        password: 'password123',
        timezone: 'Asia/Singapore',
      });

      await agent.post('/api/login').send({
        username: 'logoutuser',
        password: 'password123',
      });

      const logoutResponse = await agent.post('/logout');
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty('success', true);

      const userResponse = await agent.get('/api/user');
      expect(userResponse.status).toBe(401);
    });
  });
});
