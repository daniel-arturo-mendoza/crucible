const request = require('supertest');
const app = require('../../src/app');
const jobQueue = require('../../src/services/jobQueue');
const userLock = require('../../src/services/userLock');
const UserManager = require('../../src/services/userManager');

describe('Mobile App Integration Tests', () => {
  let testUserId;
  let testDeviceId;
  let testFCMToken;

  beforeEach(() => {
    // Generate a unique user ID and device ID for each test
    const uniqueSuffix = Date.now() + Math.floor(Math.random() * 1000);
    testUserId = `test-user-${uniqueSuffix}`;
    testDeviceId = `device-${uniqueSuffix}`;
    testFCMToken = `fcm-token-${uniqueSuffix}`;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      // The original code had userManager.removeFCMToken(userId);
      // Assuming userManager is no longer needed or is a global object.
      // For now, removing the line as it's not defined in the new_code.
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up user lock after each test
    try {
      await userLock.unlockUser(testUserId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('FCM Token Registration', () => {
    it('should register FCM token successfully', async () => {
      const response = await request(app)
        .post('/mobile/register-token')
        .send({
          userId: testUserId,
          deviceId: testDeviceId,
          fcmToken: testFCMToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.pushNotificationsEnabled).toBe(true);
    });

    it('should reject registration without required fields', async () => {
      await request(app)
        .post('/mobile/register-token')
        .send({
          userId: 'test-user'
          // Missing fcmToken
        })
        .expect(400);
    });
  });

  describe('Question Submission', () => {
    it('should submit question and return jobId', async () => {
      const response = await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId,
          prompt: 'What is the capital of France?'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.status).toBe('pending');
      expect(response.body.message).toContain('submitted for processing');
    });

    it('should reject question without required fields', async () => {
      await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId
          // Missing prompt
        })
        .expect(400);
    });

    it('should handle user already processing another request', async () => {
      // Submit first question
      const firstResponse = await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId,
          prompt: 'First question'
        })
        .expect(200);
      expect(firstResponse.body.success).toBe(true);
      expect(firstResponse.body.jobId).toBeDefined();

      // Submit second question while first is processing
      await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId,
          prompt: 'Second question'
        })
        .expect(429);
    });
  });

  describe('Job Status Polling', () => {
    it('should return job status', async () => {
      // Submit a question
      const createResponse = await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId,
          prompt: 'Test question for polling'
        })
        .expect(200);
      const jobId = createResponse.body.jobId;
      expect(jobId).toBeDefined();

      // Poll job status
      const statusResponse = await request(app)
        .get(`/mobile/job/${jobId}`)
        .set('x-user-id', testUserId)
        .expect(200);
      expect(statusResponse.body.job).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .get('/mobile/job/non-existent-job-id')
        .query({ userId: testUserId })
        .expect(404);
    });

    it('should return 403 for unauthorized access', async () => {
      // Submit a question
      const createResponse = await request(app)
        .post('/mobile/question')
        .send({
          userId: testUserId,
          prompt: 'Test question for unauthorized access'
        })
        .expect(200);
      const jobId = createResponse.body.jobId;
      expect(jobId).toBeDefined();

      // Poll job status as a different user
      await request(app)
        .get(`/mobile/job/${jobId}`)
        .set('x-user-id', `other-user-${Date.now()}`)
        .expect(403);
    });
  });

  describe('User Job History', () => {
    it('should return user job history', async () => {
      const response = await request(app)
        .get(`/mobile/jobs/${testUserId}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    it('should filter jobs by status', async () => {
      const response = await request(app)
        .get(`/mobile/jobs/${testUserId}`)
        .query({ status: 'pending', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });
  });

  describe('Push Notification Preferences', () => {
    it('should update push notification preferences', async () => {
      // Disable notifications
      let response = await request(app)
        .post('/mobile/push-preferences')
        .send({
          userId: testUserId,
          enabled: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pushNotificationsEnabled).toBe(false);

      // Enable notifications
      response = await request(app)
        .post('/mobile/push-preferences')
        .send({
          userId: testUserId,
          enabled: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pushNotificationsEnabled).toBe(true);
    });

    it('should reject invalid preference values', async () => {
      await request(app)
        .post('/mobile/push-preferences')
        .send({
          userId: testUserId,
          enabled: 'invalid'
        })
        .expect(400);
    });
  });

  describe('FCM Token Unregistration', () => {
    it('should unregister FCM token', async () => {
      const response = await request(app)
        .delete('/mobile/unregister-token')
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unregistered successfully');
    });
  });
}); 