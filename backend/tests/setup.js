// Load environment variables for tests
require('dotenv').config({ path: '../.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Set test-specific environment variables
process.env.JOB_QUEUE_TABLE = 'crucible-job-queue';
process.env.USER_LOCKS_TABLE = 'crucible-user-locks';
process.env.USERS_TABLE = 'crucible-users';
process.env.AWS_REGION = 'local';
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';

// Improved Twilio mock for WhatsApp integration tests
jest.mock('../src/services/twilio', () => {
  // Helper to simulate phone validation
  function isValidPhoneNumber(phone) {
    // Accept only E.164 format starting with +1234...
    return typeof phone === 'string' && /^\+\d{10,15}$/.test(phone);
  }

  return jest.fn().mockImplementation(() => ({
    isConfigured: jest.fn().mockReturnValue(true),
    sendWhatsAppMessage: jest.fn().mockImplementation(async (to, message) => {
      if (!isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number');
      }
      if (!message) {
        throw new Error('Missing message');
      }
      return { sid: 'test-message-sid' };
    }),
    sendCrucibleResponse: jest.fn().mockResolvedValue({ sid: 'test-response-sid' }),
    isValidPhoneNumber: jest.fn(isValidPhoneNumber)
  }));
});

jest.mock('../src/services/pushNotification', () => {
  return jest.fn().mockImplementation(() => ({
    isAvailable: jest.fn().mockReturnValue(true),
    sendNotification: jest.fn().mockResolvedValue('test-notification-id'),
    sendJobCompletionNotification: jest.fn().mockResolvedValue('test-completion-id'),
    sendJobErrorNotification: jest.fn().mockResolvedValue('test-error-id')
  }));
});

// Mock CrucibleCore for all tests
jest.mock('../../crucible-core/src/index', () => {
  return {
    CrucibleCore: jest.fn().mockImplementation(() => ({
      queryAndSynthesize: jest.fn().mockImplementation(async (prompt, providers) => {
        return `FAKE_RESPONSE: ${prompt}`;
      })
    }))
  };
});

// Global test utilities
global.testUtils = {
  // Wait for a condition to be true
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Generate test data
  generateTestData: {
    userId: () => `test-user-${Date.now()}`,
    fcmToken: () => `test-fcm-token-${Date.now()}`,
    phoneNumber: () => `+1234567890${Math.floor(Math.random() * 1000)}`,
    jobId: () => `test-job-${Date.now()}`
  }
};

console.log('🧪 Test environment configured');
console.log('📊 DynamoDB endpoint:', process.env.NODE_ENV === 'test' ? 'http://localhost:8000' : 'AWS');
console.log('🔧 Mocked services: Twilio, Firebase'); 