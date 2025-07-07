const request = require('supertest');
const app = require('../../src/app');
const AsyncWorker = require('../../src/services/asyncWorker');
const jobQueue = require('../../src/services/jobQueue');
const userManager = require('../../src/services/userManager');
const userLock = require('../../src/services/userLock');

describe('Async Worker Integration Tests', () => {
  let worker;
  const testJobs = [];

  beforeAll(async () => {
    // Create test users for the tests
    const testUsers = [
      { userId: 'test-user-1', fcmToken: 'test-fcm-token-1' },
      { userId: 'test-user-2', fcmToken: 'test-fcm-token-2' }
    ];

    for (const user of testUsers) {
      try {
        await userManager.registerUser(user.userId, user.fcmToken);
      } catch (error) {
        // User might already exist, ignore
      }
    }

    // Create worker with very fast polling for tests
    worker = new AsyncWorker({
      pollInterval: 100, // 100ms for very fast tests
      maxConcurrentJobs: 2,
      maxExecutionTime: 60000, // 1 minute for tests
      maxJobProcessingTime: 10000 // 10 seconds per job
    });
  });

  afterAll(async () => {
    // Force stop the worker to ensure cleanup
    if (worker) {
      worker.forceStop();
    }

    // Clean up test jobs
    for (const jobId of testJobs) {
      try {
        await jobQueue.deleteJob(jobId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Core Async Functionality', () => {
    beforeEach(async () => {
      // Unlock all test users before each test
      await userLock.unlockUser('test-user-1');
      await userLock.unlockUser('test-user-2');
      await userLock.unlockUser('whatsapp:+1234567890');
      await worker.start();
    });

    afterEach(async () => {
      worker.forceStop();
      // Unlock all test users after each test
      await userLock.unlockUser('test-user-1');
      await userLock.unlockUser('test-user-2');
      await userLock.unlockUser('whatsapp:+1234567890');
    });

    it('should process a single job asynchronously', async () => {
      // Create a test job
      const jobId = await jobQueue.enqueueJob({
        userId: 'test-user-1',
        prompt: 'Test question',
        channel: 'mobile'
      });
      testJobs.push(jobId);

      // Wait for job to be processed (max 5 seconds)
      await testUtils.waitFor(async () => {
        const job = await jobQueue.getJob(jobId);
        return job && (job.status === 'completed' || job.status === 'failed');
      }, 5000);

      const job = await jobQueue.getJob(jobId);
      console.log('Single job test - Job object:', JSON.stringify(job, null, 2));
      try {
        expect(job.status).toBe('completed');
        expect(job.result).toBeDefined();
      } catch (err) {
        console.error('Single job test failed:', { job, error: err.message });
        throw err;
      }
    }, 10000); // 10 second test timeout

    it('should process multiple jobs concurrently', async () => {
      const jobIds = [];

      // Create 2 jobs quickly with unique user IDs
      for (let i = 0; i < 2; i++) {
        const userId = `test-user-concurrent-${i + 1}`;
        await userLock.unlockUser(userId);
        const jobId = await jobQueue.enqueueJob({
          userId,
          prompt: `Concurrent test ${i + 1}`,
          channel: 'mobile'
        });
        jobIds.push(jobId);
        testJobs.push(jobId);
      }

      // Wait for all jobs to complete (max 8 seconds)
      await testUtils.waitFor(async () => {
        const jobs = await Promise.all(jobIds.map(id => jobQueue.getJob(id)));
        return jobs.every(job => job && (job.status === 'completed' || job.status === 'failed'));
      }, 8000);

      const jobs = await Promise.all(jobIds.map(id => jobQueue.getJob(id)));
      console.log('Concurrent jobs test - Job objects:', JSON.stringify(jobs, null, 2));
      // Verify all jobs completed
      for (const jobId of jobIds) {
        const job = await jobQueue.getJob(jobId);
        try {
          expect(job.status).toBe('completed');
        } catch (err) {
          console.error('Concurrent jobs test failed:', { job, err });
          throw err;
        }
      }
    }, 15000); // 15 second test timeout

    it('should handle different channels', async () => {
      // Test mobile channel
      const mobileUserId = 'test-user-mobile';
      const whatsappUserId = 'whatsapp:+1234567890';
      await userLock.unlockUser(mobileUserId);
      await userLock.unlockUser(whatsappUserId);
      const mobileJobId = await jobQueue.enqueueJob({
        userId: mobileUserId,
        prompt: 'Mobile test',
        channel: 'mobile'
      });
      testJobs.push(mobileJobId);

      // Test WhatsApp channel
      const whatsappJobId = await jobQueue.enqueueJob({
        userId: whatsappUserId,
        prompt: 'WhatsApp test',
        channel: 'whatsapp',
        channelData: {
          phoneNumber: '+1234567890'
        }
      });
      testJobs.push(whatsappJobId);

      // Wait for both jobs to complete (max 8 seconds)
      await testUtils.waitFor(async () => {
        const mobileJob = await jobQueue.getJob(mobileJobId);
        const whatsappJob = await jobQueue.getJob(whatsappJobId);
        return mobileJob && whatsappJob && 
               (mobileJob.status === 'completed' || mobileJob.status === 'failed') &&
               (whatsappJob.status === 'completed' || whatsappJob.status === 'failed');
      }, 8000);

      const mobileJob = await jobQueue.getJob(mobileJobId);
      console.log('Multi-channel test - Job object:', JSON.stringify(mobileJob, null, 2));
      const whatsappJob = await jobQueue.getJob(whatsappJobId);
      try {
        expect(mobileJob.status).toBe('completed');
        expect(whatsappJob.status).toBe('completed');
        expect(mobileJob.channel).toBe('mobile');
        expect(whatsappJob.channel).toBe('whatsapp');
      } catch (err) {
        console.error('Different channels test failed:', { mobileJob, whatsappJob, err });
        throw err;
      }
    }, 15000); // 15 second test timeout
  });

  describe('Worker Lifecycle', () => {
    it('should start and stop gracefully', async () => {
      const testWorker = new AsyncWorker({
        pollInterval: 100,
        maxExecutionTime: 30000
      });
      
      await testWorker.start();
      expect(testWorker.isRunning()).toBe(true);

      await testWorker.stop();
      expect(testWorker.isRunning()).toBe(false);
    }, 5000);
  });
}); 