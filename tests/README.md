# Test Suite Documentation

## Overview

This test suite provides comprehensive testing for the Timezone Test Application, covering unit tests, integration tests, and security tests.

## Test Structure

```
tests/
├── setup.js                      # Test configuration and setup
├── unit/                         # Unit tests
│   ├── password.test.js         # Password hashing and validation
│   └── validation.test.js       # Input validation functions
└── integration/                  # Integration tests
    ├── api.test.js              # API endpoint tests
```

## Prerequisites

Install test dependencies:
```bash
npm install --save-dev jest supertest @types/jest
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Run tests with coverage report
```bash
npm test -- --coverage
```

## Test Categories

### 1. Unit Tests

#### Password Tests (`tests/unit/password.test.js`)
- Password hashing with bcrypt
- Password comparison and verification
- Password validation rules
- Special character handling
- Edge cases (empty, long passwords)

#### Validation Tests (`tests/unit/validation.test.js`)
- Username validation (length, characters)
- Timezone validation
- File upload validation (type, size)
- Session validation

### 2. Integration Tests

#### API Tests (`tests/integration/api.test.js`)
Tests for all API endpoints:
- `POST /api/registration` - User registration
- `POST /api/login` - User authentication
- `GET /api/user` - Get user data
- `POST /api/user/update` - Update profile
- `POST /logout` - Logout functionality

## Test Coverage Goals

- **API Endpoints**: 100% coverage of all routes
- **Validation**: All input validation paths covered
- **Edge Cases**: Boundary conditions and error handling

## Key Testing Patterns

### 1. Using Test Agents for Session Management
```javascript
const agent = request.agent(app);
await agent.post('/api/login').send({ username: 'user', password: 'pass' });
// Agent maintains session across requests
```

### 2. In-Memory Database for Tests
Each test suite uses an in-memory SQLite database that's created fresh for each test, ensuring test isolation.

### 3. Password Hashing Verification
Tests verify that:
- Passwords are never stored in plaintext
- Bcrypt hashing is used correctly
- Password hashes are never exposed in API responses

### 4. Security Best Practices
- All SQL queries use parameterized statements
- User input is validated before processing
- Error messages don't leak information about user existence
- Sessions are properly isolated between users

## Common Issues and Solutions

### Issue: Tests timing out
**Solution**: Increase timeout in `tests/setup.js`:
```javascript
jest.setTimeout(15000); // 15 seconds
```

### Issue: Database connection errors
**Solution**: Ensure proper cleanup in `afterEach` hooks:
```javascript
afterEach((done) => {
  if (db) {
    db.close(done);
  } else {
    done();
  }
});
```

### Issue: Session not persisting
**Solution**: Use `request.agent(app)` instead of `request(app)` for tests requiring session persistence.

## Adding New Tests

### For new API endpoints:
1. Add test in `tests/integration/api.test.js`
2. Follow the pattern of existing tests
3. Test both success and failure cases
4. Verify authentication requirements

### For new validation:
1. Add test in `tests/unit/validation.test.js`
2. Test valid inputs
3. Test all invalid input types
4. Test edge cases

### For security concerns:
1. Add test in `tests/integration/security.test.js`
2. Simulate malicious input
3. Verify proper handling and sanitization

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
  
- name: Upload coverage
  run: npm test -- --coverage
```

## Test Metrics

Current test suite includes:
- **40+ individual test cases**
- **Unit tests**: 25+ tests
- **Integration tests**: 15+ tests
- **Security tests**: 10+ tests

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Cleanup**: Databases and sessions are cleaned up after each test
3. **Clarity**: Test names clearly describe what is being tested
4. **Coverage**: Both happy paths and error cases are tested
5. **Security**: Common vulnerabilities are explicitly tested

## Next Steps

To extend the test suite:
1. Add E2E tests using Puppeteer or Playwright
2. Add performance tests for API endpoints
3. Add tests for file upload functionality
4. Add tests for concurrent user sessions
5. Add load testing for scalability verification

## Debugging Tests

To debug a specific test:
```bash
# Run a specific test file
npx jest tests/unit/password.test.js

# Run a specific test by name
npx jest -t "should hash password correctly"

# Run with verbose output
npx jest --verbose
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
