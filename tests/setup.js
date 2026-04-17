// Test setup and global configurations
const fs = require('fs');
const path = require('path');

// Clean up test database before each test suite
beforeAll(() => {
  const testDbPath = path.join(__dirname, '..', 'test-users.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Set test timeout
jest.setTimeout(10000);

/** Drain microtasks and next macrotick (for async fetch handlers in DOM tests). */
global.flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => {
    if (typeof setImmediate === 'function') {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
