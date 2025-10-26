# Quick Start - Testing

## Setup (One Time)

1. Install test dependencies:
```bash
npm install
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests with coverage:
```bash
npm test -- --coverage
```

### Run specific test file:
```bash
npx jest tests/unit/password.test.js
```

### Watch mode (re-run on file changes):
```bash
npm run test:watch
```

## Expected Output

When you run `npm test`, you should see:

```
PASS tests/unit/password.test.js
PASS tests/unit/validation.test.js
PASS tests/integration/api.test.js
PASS tests/integration/security.test.js

Test Suites: 4 passed, 4 total
Tests:       40+ passed, 40+ total
```

## What's Being Tested?

✅ **API Endpoints** - Registration, Login, Profile updates, Logout  
✅ **Security** - SQL injection, XSS, Password hashing  
✅ **Validation** - Username, Password, Timezone, File uploads  
✅ **Sessions** - Authentication, User isolation

## Troubleshooting

**Issue**: `Cannot find module 'jest'`  
**Fix**: Run `npm install`

**Issue**: Tests timeout  
**Fix**: Increase timeout in `tests/setup.js`

**Issue**: Port already in use  
**Fix**: Tests use in-memory database, no port needed

## Next Steps

- View detailed test documentation: `tests/README.md`
- Check coverage report: `coverage/lcov-report/index.html`
- Add your own tests following the examples
