const request = require('supertest');
const app = require('../../src/app');
const jobQueue = require('../../src/services/jobQueue');
const userLock = require('../../src/services/userLock');

describe('WhatsApp Integration Tests', () => {
  let phoneNumber, userId;

  beforeEach(async () => {
    // Generate unique phone number for each test to avoid user lock conflicts
    phoneNumber = testUtils.generateTestData.phoneNumber();
    userId = `whatsapp:${phoneNumber}`;
    
    // Clean up any existing user locks
    try {
      await userLock.unlockUser(userId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('WhatsApp Webhook', () => {
    it('should handle incoming WhatsApp message', async () => {
      const webhookData = {
        Body: 'What is machine learning?',
        From: phoneNumber,
        MessageSid: 'test-message-sid',
        To: '+1234567890'
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
      expect(response.body.status).toBe('pending');
    });

    it('should handle media messages', async () => {
      const webhookData = {
        Body: 'Please analyze this image',
        From: phoneNumber,
        MessageSid: 'test-media-message-sid',
        To: '+1234567890',
        NumMedia: '1',
        MediaUrl0: 'https://example.com/test-image.jpg'
      };

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });

    it('should reject messages without required fields', async () => {
      await request(app)
        .post('/webhook/whatsapp')
        .send({
          From: phoneNumber
          // Missing Body
        })
        .expect(400);
    });

    it('should handle user already processing another request', async () => {
      // First message
      await request(app)
        .post('/webhook/whatsapp')
        .send({
          Body: 'First question',
          From: phoneNumber,
          MessageSid: 'test-first-message',
          To: '+1234567890'
        })
        .expect(200);

      // Second message should be rejected
      await request(app)
        .post('/webhook/whatsapp')
        .send({
          Body: 'Second question',
          From: phoneNumber,
          MessageSid: 'test-second-message',
          To: '+1234567890'
        })
        .expect(429);

      // Clean up user lock
      await userLock.unlockUser(userId);
    });
  });

  describe('WhatsApp Message Sending', () => {
    it('should send WhatsApp message successfully', async () => {
      const response = await request(app)
        .post('/whatsapp/send')
        .send({
          to: phoneNumber,
          message: 'Hello from Crucible!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBeDefined();
    });

    it('should reject sending without required fields', async () => {
      await request(app)
        .post('/whatsapp/send')
        .send({
          message: 'Hello from Crucible!'
          // Missing 'to' field
        })
        .expect(400);
    });

    it('should reject invalid phone numbers', async () => {
      await request(app)
        .post('/whatsapp/send')
        .send({
          to: 'invalid-phone',
          message: 'Hello from Crucible!'
        })
        .expect(400);
    });
  });

  describe('Job Processing for WhatsApp', () => {
    let jobId;
    let asyncWorker;

    beforeAll(async () => {
      // Start async worker for job processing tests
      const AsyncWorker = require('../../src/services/asyncWorker');
      asyncWorker = new AsyncWorker();
      await asyncWorker.start();

      // Create a test job via webhook
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          Body: 'Test question for job processing',
          From: phoneNumber,
          MessageSid: 'test-job-processing',
          To: '+1234567890'
        });
      jobId = response.body.jobId;
      // Unlock the user after job creation so the worker can process it
      await userLock.unlockUser(userId);
    });

    afterAll(async () => {
      // Stop async worker
      if (asyncWorker) {
        await asyncWorker.forceStop();
      }
    });

    it('should process WhatsApp job and send response', async () => {
      // Wait for job to be processed (this would normally be done by the async worker)
      await testUtils.waitFor(async () => {
        const job = await jobQueue.getJob(jobId);
        return job && job.status === 'completed';
      }, 10000);

      const job = await jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job.status).toBe('completed');
      expect(job.channel).toBe('whatsapp');
      expect(job.result).toBeDefined();
      expect(job.result.response).toBeDefined();
    });

    it('should handle job errors gracefully', async () => {
      // Create a job that might fail
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          Body: 'This might cause an error',
          From: phoneNumber,
          MessageSid: 'test-error-job',
          To: '+1234567890'
        });

      const errorJobId = response.body.jobId;
      // Unlock the user after job creation so the worker can process it
      await userLock.unlockUser(userId);
      // Wait for job to be processed
      await testUtils.waitFor(async () => {
        const job = await jobQueue.getJob(errorJobId);
        return job && (job.status === 'completed' || job.status === 'failed');
      }, 10000);

      const job = await jobQueue.getJob(errorJobId);
      expect(job).toBeDefined();
      expect(['completed', 'failed']).toContain(job.status);
    });
  });

  describe('WhatsApp Status Webhook', () => {
    it('should handle message delivery status', async () => {
      const statusData = {
        MessageSid: 'test-message-sid',
        MessageStatus: 'delivered',
        To: phoneNumber
      };

      const response = await request(app)
        .post('/webhook/whatsapp-status')
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle failed message status', async () => {
      const statusData = {
        MessageSid: 'test-failed-message-sid',
        MessageStatus: 'failed',
        ErrorCode: '30008',
        To: phoneNumber
      };

      const response = await request(app)
        .post('/webhook/whatsapp-status')
        .send(statusData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
}); 