const { CrucibleCore } = require('../../../crucible-core/src/index');
const path = require('path');
const jobQueue = require('./jobQueue');
const userLock = require('./userLock');
const TwilioService = require('./twilio');

class AsyncWorker {
  constructor() {
    // Initialize Crucible Core
    this.crucible = new CrucibleCore({
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY
        },
        deepseek: {
          apiKey: process.env.DEEPSEEK_API_KEY,
          apiUrl: process.env.DEEPSEEK_API_URL
        }
      },
      synthesis: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        configPath: path.join(__dirname, '../../crucible-synthesis-config.json')
      }
    });

    // Initialize Twilio Service
    this.twilioService = new TwilioService();

    // Worker state
    this.isRunning = false;
    this.pollInterval = 5000; // 5 seconds
    this.maxConcurrentJobs = 3;
    this.processingJobs = new Set();
  }

  /**
   * Start the async worker
   */
  async start() {
    if (this.isRunning) {
      console.log('Async worker is already running');
      return;
    }

    console.log('Starting async worker...');
    this.isRunning = true;

    // Start polling for jobs
    this.pollForJobs();
  }

  /**
   * Stop the async worker
   */
  stop() {
    console.log('Stopping async worker...');
    this.isRunning = false;
  }

  /**
   * Main polling loop
   */
  async pollForJobs() {
    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.processingJobs.size < this.maxConcurrentJobs) {
          await this.processNextJob();
        }

        // Wait before next poll
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('Error in async worker polling loop:', error);
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Process the next available job
   */
  async processNextJob() {
    try {
      // Get pending jobs (limit to 1 to process one at a time)
      const pendingJobs = await jobQueue.getPendingJobs(1);
      
      if (pendingJobs.length === 0) {
        return; // No jobs to process
      }

      const job = pendingJobs[0];
      
      // Check if we're already processing this job
      if (this.processingJobs.has(job.jobId)) {
        return;
      }

      // Check if user is already locked
      const isUserLocked = await userLock.isUserLocked(job.userId);
      if (isUserLocked) {
        console.log(`User ${job.userId} is already locked, skipping job ${job.jobId}`);
        return;
      }

      // Start processing this job
      this.processingJobs.add(job.jobId);
      console.log(`Starting to process job ${job.jobId} for user ${job.userId}`);

      // Process job in background (don't await to allow concurrent processing)
      this.processJob(job).catch(error => {
        console.error(`Error processing job ${job.jobId}:`, error);
      });

    } catch (error) {
      console.error('Error getting pending jobs:', error);
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    try {
      // Lock the user
      await userLock.lockUser(job.userId, 300); // 5 minutes lock
      console.log(`Locked user ${job.userId} for job ${job.jobId}`);

      // Update job status to processing
      await jobQueue.updateJobStatus(job.jobId, 'processing');
      console.log(`Updated job ${job.jobId} status to processing`);

      // Process with Crucible AI
      const crucibleResponse = await this.processWithCrucible(job.prompt);
      
      // Send response via WhatsApp
      await this.sendResponse(job, crucibleResponse);

      // Update job status to completed
      await jobQueue.updateJobStatus(job.jobId, 'completed', {
        response: crucibleResponse,
        completedAt: Date.now()
      });
      console.log(`Completed job ${job.jobId}`);

    } catch (error) {
      console.error(`Error processing job ${job.jobId}:`, error);
      
      // Update job status to failed
      await jobQueue.updateJobStatus(job.jobId, 'failed', {
        error: error.message,
        failedAt: Date.now()
      });

      // Send error message to user
      await this.sendErrorMessage(job, error.message);
    } finally {
      // Unlock the user
      try {
        await userLock.unlockUser(job.userId);
        console.log(`Unlocked user ${job.userId} after job ${job.jobId}`);
      } catch (unlockError) {
        console.error(`Error unlocking user ${job.userId}:`, unlockError);
      }

      // Remove from processing set
      this.processingJobs.delete(job.jobId);
    }
  }

  /**
   * Process prompt with Crucible AI
   */
  async processWithCrucible(prompt) {
    try {
      const providers = ['openai', 'deepseek'];
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI processing timeout')), 30000); // 30 second timeout
      });
      
      const cruciblePromise = this.crucible.queryAndSynthesize(prompt, providers);
      const response = await Promise.race([cruciblePromise, timeoutPromise]);
      
      return response;
    } catch (error) {
      console.error('Error processing with Crucible:', error);
      throw error;
    }
  }

  /**
   * Send response via WhatsApp
   */
  async sendResponse(job, crucibleResponse) {
    try {
      if (!this.twilioService.isConfigured()) {
        throw new Error('Twilio is not properly configured');
      }

      await this.twilioService.sendCrucibleResponse(
        job.phoneNumber,
        job.prompt,
        crucibleResponse
      );

      console.log(`Sent response for job ${job.jobId} to ${job.phoneNumber}`);
    } catch (error) {
      console.error(`Error sending response for job ${job.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Send error message to user
   */
  async sendErrorMessage(job, errorMessage) {
    try {
      if (!this.twilioService.isConfigured()) {
        return; // Skip if Twilio not configured
      }

      let userFriendlyMessage = 'Sorry, I encountered an error processing your request. Please try again.';
      
      if (errorMessage === 'AI processing timeout') {
        userFriendlyMessage = 'Sorry, your request took too long to process. Please try a simpler question or try again later.';
      }

      await this.twilioService.sendWhatsAppMessage(job.phoneNumber, userFriendlyMessage);
      console.log(`Sent error message for job ${job.jobId} to ${job.phoneNumber}`);
    } catch (error) {
      console.error(`Error sending error message for job ${job.jobId}:`, error);
    }
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processingJobs: Array.from(this.processingJobs),
      processingCount: this.processingJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }
}

module.exports = AsyncWorker; 