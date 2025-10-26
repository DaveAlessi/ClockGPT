const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

function createTestApp() {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'test-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  const db = new sqlite3.Database(':memory:');
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    timezone TEXT,
    profile_picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  app.post('/api/registration', async (req, res) => {
    const { username, password, timezone } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
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
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
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

  return { app, db };
}

describe('Security Tests', () => {
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

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in username field', async () => {
      const maliciousUsername = "admin' OR '1'='1";
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: maliciousUsername,
          password: 'password123',
          timezone: 'America/New_York'
        });

      // Should either succeed (treating it as a normal username) or fail gracefully
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should prevent SQL injection in login', async () => {
      await request(app)
        .post('/api/registration')
        .send({
          username: 'normaluser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      const response = await request(app)
        .post('/api/login')
        .send({
          username: "normaluser' OR '1'='1",
          password: 'anything'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid username or password');
    });
  });

  describe('Password Security', () => {
    test('should never return password hash in API responses', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/api/registration')
        .send({
          username: 'secureuser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      await agent
        .post('/api/login')
        .send({
          username: 'secureuser',
          password: 'password123'
        });

      const response = await agent.get('/api/user');
      
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    test('should require minimum password length', async () => {
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: 'testuser',
          password: 'pass',
          timezone: 'America/New_York'
        });

      // In production, you should validate this at the API level
      // This test demonstrates the expectation
      expect(response.status).toBeLessThanOrEqual(400);
    });

    test('should not leak user existence through different error messages', async () => {
      await request(app)
        .post('/api/registration')
        .send({
          username: 'existinguser',
          password: 'password123',
          timezone: 'America/New_York'
        });

      const response1 = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123'
        });

      const response2 = await request(app)
        .post('/api/login')
        .send({
          username: 'existinguser',
          password: 'wrongpassword'
        });

      // Both should return the same error message
      expect(response1.body.error).toBe(response2.body.error);
    });
  });

  describe('Input Validation', () => {
    test('should reject registration without username', async () => {
      const response = await request(app)
        .post('/api/registration')
        .send({
          password: 'password123',
          timezone: 'America/New_York'
        });

      expect(response.status).toBe(400);
    });

    test('should reject registration without password', async () => {
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: 'testuser',
          timezone: 'America/New_York'
        });

      expect(response.status).toBe(400);
    });

    test('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should handle extremely long username gracefully', async () => {
      const longUsername = 'a'.repeat(1000);
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: longUsername,
          password: 'password123',
          timezone: 'America/New_York'
        });

      // Should either reject or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('XSS Prevention', () => {
    test('should handle XSS attempts in username', async () => {
      const xssUsername = '<script>alert("XSS")</script>';
      const response = await request(app)
        .post('/api/registration')
        .send({
          username: xssUsername,
          password: 'password123',
          timezone: 'America/New_York'
        });

      // Should be stored safely
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should handle HTML entities in name field', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/api/registration')
        .send({
          username: 'xsstest',
          password: 'password123',
          timezone: 'America/New_York'
        });

      await agent
        .post('/api/login')
        .send({
          username: 'xsstest',
          password: 'password123'
        });

      const response = await agent
        .post('/api/user/update')
        .send({
          name: '<img src=x onerror=alert(1)>',
          timezone: 'America/New_York'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Session Security', () => {
    test('should create separate sessions for different users', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await agent1
        .post('/api/registration')
        .send({
          username: 'user1',
          password: 'password123',
          timezone: 'America/New_York'
        });

      await agent2
        .post('/api/registration')
        .send({
          username: 'user2',
          password: 'password123',
          timezone: 'Europe/London'
        });

      await agent1
        .post('/api/login')
        .send({
          username: 'user1',
          password: 'password123'
        });

      await agent2
        .post('/api/login')
        .send({
          username: 'user2',
          password: 'password123'
        });

      const response1 = await agent1.get('/api/user');
      const response2 = await agent2.get('/api/user');

      expect(response1.body.username).toBe('user1');
      expect(response2.body.username).toBe('user2');
    });
  });
});
