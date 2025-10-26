const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create a test version of the server
function createTestApp() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'test-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  // Test database
  const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
      console.error('Error opening test database', err);
    } else {
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

  app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  return { app, db };
}

describe('API Integration Tests', () => {
  let app;
  let db;

  beforeEach(() => {
    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;
  });

  afterEach((done) => {
    if (db) {
      db.close(done);
    } else {
      done();
    }
  });

  describe('POST /api/registration', () => {
    test('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: 'testuser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
    });

    test('should fail when username already exists', async () => {
      await request(app)
        .post('/api/registration')
        .send({
          username: 'testuser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      const response = await request(app)
        .post('/api/registration')
        .send({
          username: 'testuser',
          password: 'password456',
          timezone: 'Europe/London'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    test('should hash the password before storing', async () => {
      const password = 'mySecretPassword';
      await request(app)
        .post('/api/registration')
        .send({
          username: 'secureuser',
          password: password,
          timezone: 'Asia/Tokyo'
        });

      db.get('SELECT password_hash FROM users WHERE username = ?', ['secureuser'], (err, user) => {
        expect(user.password_hash).not.toBe(password);
        expect(user.password_hash.length).toBeGreaterThan(20);
      });
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/registration')
        .send({
          username: 'loginuser',
          password: 'password123',
          timezone: 'America/Los_Angeles'
        });
    });

    test('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'loginuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'loginuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    test('should fail with non-existent username', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });
  });

  describe('GET /api/user', () => {
    test('should return user data when authenticated', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/api/registration')
        .send({
          username: 'getuser',
          password: 'password123',
          timezone: 'Europe/Paris'
        });

      await agent
        .post('/api/login')
        .send({
          username: 'getuser',
          password: 'password123'
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
  });

  describe('POST /api/user/update', () => {
    test('should successfully update user profile', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/api/registration')
        .send({
          username: 'updateuser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      await agent
        .post('/api/login')
        .send({
          username: 'updateuser',
          password: 'password123'
        });

      const response = await agent
        .post('/api/user/update')
        .send({
          name: 'John Doe',
          timezone: 'Europe/London'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const userResponse = await agent.get('/api/user');
      expect(userResponse.body).toHaveProperty('name', 'John Doe');
      expect(userResponse.body).toHaveProperty('timezone', 'Europe/London');
    });

    test('should fail when not authenticated', async () => {
      const response = await request(app)
        .post('/api/user/update')
        .send({
          name: 'John Doe',
          timezone: 'Europe/London'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('POST /logout', () => {
    test('should successfully logout user', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/api/registration')
        .send({
          username: 'logoutuser',
          password: 'password123',
          timezone: 'Asia/Singapore'
        });

      await agent
        .post('/api/login')
        .send({
          username: 'logoutuser',
          password: 'password123'
        });

      const logoutResponse = await agent.post('/logout');
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty('success', true);

      const userResponse = await agent.get('/api/user');
      expect(userResponse.status).toBe(401);
    });
  });
});
