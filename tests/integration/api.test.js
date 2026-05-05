const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../../server');

describe('API Integration Tests', () => {
  let app;
  let close;
  let uploadDir;

  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clockgpt-upload-'));
    const instance = createApp({
      dbPath: ':memory:',
      sessionSecret: 'test-secret',
      cookieSecure: false,
      uploadDir,
      uploadMaxBytes: 1024 * 1024,
      rateLimitWindowMs: 60 * 1000,
      registrationRateLimitMax: 2,
      loginRateLimitMax: 2,
      bcryptRounds: 4
    });
    app = instance.app;
    close = instance.close;
  });

  afterEach(async () => {
    if (close) await close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  async function csrf(agent) {
    const response = await agent.get('/api/csrf-token');
    return response.body.csrfToken;
  }

  async function register(agent, username = 'testuser') {
    const token = await csrf(agent);
    return agent.post('/api/registration').set('x-csrf-token', token).send({
      username,
      password: 'password123',
      timezone: 'America/New_York'
    });
  }

  async function login(agent, username = 'testuser', password = 'password123') {
    const token = await csrf(agent);
    return agent.post('/api/login').set('x-csrf-token', token).send({ username, password });
  }

  describe('POST /api/registration', () => {
    test('should successfully register a new user', async () => {
      const agent = request.agent(app);
      const response = await register(agent);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userId');
    });

    test('should fail when payload is invalid', async () => {
      const agent = request.agent(app);
      const token = await csrf(agent);
      const response = await agent.post('/api/registration').set('x-csrf-token', token).send({
        username: 'ab',
        password: '123',
        timezone: 'Invalid/Timezone'
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    test('should fail when username already exists', async () => {
      const agent = request.agent(app);
      await register(agent);
      const response = await register(agent);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username already exists');
    });

    test('should enforce registration rate limits', async () => {
      const agent = request.agent(app);
      await register(agent, 'user_one');
      await register(agent, 'user_two');
      const response = await register(agent, 'user_three');
      expect(response.status).toBe(429);
    });

    test('should reject registration requests without CSRF token', async () => {
      const agent = request.agent(app);
      const response = await agent.post('/api/registration').send({
        username: 'user_one',
        password: 'password123',
        timezone: 'America/New_York'
      });
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      const agent = request.agent(app);
      await register(agent, 'loginuser');
    });

    test('should successfully login with correct credentials', async () => {
      const agent = request.agent(app);
      const response = await login(agent, 'loginuser');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should fail with incorrect password', async () => {
      const agent = request.agent(app);
      const response = await login(agent, 'loginuser', 'wrongpassword');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    test('should enforce login rate limits', async () => {
      const agent = request.agent(app);
      await login(agent, 'loginuser', 'wrongpassword');
      await login(agent, 'loginuser', 'wrongpassword');
      const response = await login(agent, 'loginuser', 'wrongpassword');
      expect(response.status).toBe(429);
    });

    test('should reject login requests without CSRF token', async () => {
      const agent = request.agent(app);
      const response = await agent.post('/api/login').send({
        username: 'loginuser',
        password: 'password123'
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated profile routes', () => {
    test('should require authentication for /api/user', async () => {
      const response = await request(app).get('/api/user');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });

    test('should require CSRF token for profile updates', async () => {
      const agent = request.agent(app);
      await register(agent, 'profileuser');
      await login(agent, 'profileuser');

      const response = await agent.post('/api/user/update').send({
        name: 'John Doe',
        timezone: 'Europe/London'
      });
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Invalid CSRF token');
    });

    test('should update profile with valid CSRF token', async () => {
      const agent = request.agent(app);
      await register(agent, 'updateuser');
      await login(agent, 'updateuser');
      const token = await csrf(agent);

      const updateResponse = await agent
        .post('/api/user/update')
        .set('x-csrf-token', token)
        .send({
          name: 'John Doe',
          timezone: 'Europe/London'
        });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('success', true);

      const userResponse = await agent.get('/api/user');
      expect(userResponse.status).toBe(200);
      expect(userResponse.body).toHaveProperty('name', 'John Doe');
      expect(userResponse.body).toHaveProperty('timezone', 'Europe/London');
    });

    test('should reject unsafe profile picture uploads', async () => {
      const agent = request.agent(app);
      await register(agent, 'uploaduser');
      await login(agent, 'uploaduser');
      const token = await csrf(agent);

      const response = await agent
        .post('/api/user/upload-picture')
        .set('x-csrf-token', token)
        .attach('profilePicture', Buffer.from('not-image'), {
          filename: 'payload.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should require CSRF token for logout', async () => {
      const agent = request.agent(app);
      await register(agent, 'logoutuser');
      await login(agent, 'logoutuser');

      const logoutResponse = await agent.post('/logout');
      expect(logoutResponse.status).toBe(403);
      expect(logoutResponse.body).toHaveProperty('error', 'Invalid CSRF token');
    });
  });
});
