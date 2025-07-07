# Testing Guide for Crucible Backend

This document provides comprehensive testing instructions for the Crucible backend, including integration tests, unit tests, and local development testing.

## 🏗️ Test Architecture

The testing setup includes:
- **Jest** as the test framework
- **Docker Compose** for local DynamoDB
- **Supertest** for HTTP endpoint testing
- **Mocked external services** (Twilio, Firebase)

## 📋 Prerequisites

1. **Docker & Docker Compose** installed
2. **Node.js** (v16 or higher)
3. **npm** or **yarn**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local DynamoDB
```bash
npm run start:test-db
```

### 3. Create Test Tables
```bash
npm run setup:test-db
```

### 4. Run All Integration Tests
```bash
npm run test:integration
```

### 5. Clean Up
```bash
npm run stop:test-db
```

## 🧪 Test Categories

### Integration Tests
Located in `tests/integration/`

- **`mobile-app.test.js`** - Mobile app flow testing
- **`whatsapp.test.js`** - WhatsApp integration testing
- **`async-worker.test.js`** - Async worker functionality testing

### Unit Tests
Located in `tests/unit/` (to be implemented)

- Service-level testing
- Utility function testing
- Mock-heavy tests

## 📝 Available Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run specific test categories
npm run test:integration    # All integration tests
npm run test:mobile         # Mobile app tests only
npm run test:whatsapp       # WhatsApp tests only
npm run test:worker         # Async worker tests only

# Database management
npm run start:test-db       # Start DynamoDB container
npm run stop:test-db        # Stop DynamoDB container
npm run setup:test-db       # Create test tables

# Full test suite (start DB, run tests, cleanup)
npm run test:full
```

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Coverage reporting enabled
- 30-second timeout for integration tests
- Setup file: `tests/setup.js`

### Test Setup (`tests/setup.js`)
- Loads environment variables
- Mocks external services (Twilio, Firebase)
- Provides global test utilities
- Sets test environment variables

### Docker Compose (`docker-compose.yml`)
- Local DynamoDB instance
- Port 8000 for DynamoDB access
- Persistent volume for data

## 🎯 Test Coverage

### Mobile App Flow
- ✅ FCM token registration/unregistration
- ✅ Question submission and validation
- ✅ Job status polling
- ✅ User job history
- ✅ Push notification preferences
- ✅ User locking (rate limiting)

### WhatsApp Flow
- ✅ Incoming message webhook handling
- ✅ Media message support
- ✅ Message sending
- ✅ Status webhook handling
- ✅ User locking (rate limiting)

### Async Worker
- ✅ Worker lifecycle (start/stop)
- ✅ Job processing (single and concurrent)
- ✅ Error handling
- ✅ Priority-based processing
- ✅ Channel-specific processing
- ✅ Performance under load

## 🛠️ Test Utilities

### Global Test Utilities (`testUtils`)

```javascript
// Wait for a condition to be true
await testUtils.waitFor(async () => {
  const job = await jobQueue.getJob(jobId);
  return job && job.status === 'completed';
}, 5000, 100);

// Generate test data
const userId = testUtils.generateTestData.userId();
const fcmToken = testUtils.generateTestData.fcmToken();
const phoneNumber = testUtils.generateTestData.phoneNumber();
const jobId = testUtils.generateTestData.jobId();
```

### Mocked Services

**Twilio Service Mock:**
- `isConfigured()` → `true`
- `sendWhatsAppMessage()` → `{ sid: 'test-message-sid' }`
- `sendCrucibleResponse()` → `{ sid: 'test-response-sid' }`
- `isValidPhoneNumber()` → `true`

**Firebase Service Mock:**
- `isAvailable()` → `true`
- `sendNotification()` → `'test-notification-id'`
- `sendJobCompletionNotification()` → `'test-completion-id'`
- `sendJobErrorNotification()` → `'test-error-id'`

## 🔍 Debugging Tests

### Enable Verbose Logging
```bash
npm test -- --verbose
```

### Run Single Test File
```bash
npm test -- tests/integration/mobile-app.test.js
```

### Run Single Test
```bash
npm test -- --testNamePattern="should submit question and return jobId"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/integration/mobile-app.test.js
```

## 🐛 Common Issues

### DynamoDB Connection Issues
```bash
# Check if DynamoDB is running
docker ps | grep dynamodb

# Restart DynamoDB
npm run stop:test-db
npm run start:test-db
sleep 5
npm run setup:test-db
```

### Port Conflicts
If port 8000 is in use:
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

### Test Timeouts
Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000, // 60 seconds
```

## 📊 Coverage Reports

After running tests with coverage:
```bash
npm run test:coverage
```

Reports are generated in:
- **Console**: Coverage summary
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      dynamodb:
        image: amazon/dynamodb-local
        ports:
          - 8000:8000
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run setup:test-db
      - run: npm run test:integration
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Clean up test data in `afterAll` hooks
5. Add appropriate timeouts for async operations
6. Update this documentation if needed 