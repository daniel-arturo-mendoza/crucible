const { CrucibleCore } = require('../../../crucible-core/src/index');
const path = require('path');
const jobQueue = require('./jobQueue');
const userLock = require('./userLock');
const ResponseRouter = require('./responseRouter');

class AsyncWorker {
  constructor(options = {}) {
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

    // Initialize Response Router
    this.responseRouter = new ResponseRouter();

    // Configuration
    // Use a much shorter polling interval in test mode
    this.pollInterval = process.env.NODE_ENV === 'test' ? 100 : (options.pollInterval || 5000); // 5 seconds
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.maxExecutionTime = options.maxExecutionTime || 600000; // 10 minutes (Lambda has 15 min max)
    this.maxJobProcessingTime = options.maxJobProcessingTime || 300000; // 5 minutes per job

    // Worker state
    this._running = false;
    this.processingJobs = new Set();
    this.pollingInterval = null;
    this.startTime = null;
  }

  /**
   * Start the async worker
   */
  async start() {
    if (this._running) {
      console.log('Async worker is already running');
      return;
    }

    console.log('Starting async worker...');
    this._running = true;
    this.startTime = Date.now();

    // Start polling for jobs
    this.startPolling();
  }

  /**
   * Force stop the worker immediately (for tests)
   */
  forceStop() {
    console.log('Force stopping async worker...');
    this._running = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Clear any processing jobs immediately
    this.processingJobs.clear();
  }

  /**
   * Stop the worker and wait for all operations to complete
   */
  async stop() {
    console.log('Stopping async worker...');
    this._running = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Wait for any currently processing jobs to complete
    if (this.processingJobs.size > 0) {
      console.log(`Waiting for ${this.processingJobs.size} jobs to complete...`);
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.processingJobs.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 10 seconds to prevent hanging
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('Timeout waiting for jobs to complete, forcing stop');
          this.processingJobs.clear();
          resolve();
        }, 10000);
      });
    }
  }

  /**
   * Start polling for jobs
   */
  startPolling() {
    this.pollingInterval = setInterval(async () => {
      if (!this._running) {
        return;
      }

      // Check if we're approaching Lambda timeout
      if (this.isApproachingTimeout()) {
        console.log('Approaching execution timeout, stopping worker gracefully');
        this.stop();
        return;
      }

      try {
        // Check if we can process more jobs
        if (this.processingJobs.size < this.maxConcurrentJobs) {
          await this.processNextJob();
        }
      } catch (error) {
        console.error('Error in async worker polling loop:', error);
      }
    }, this.pollInterval);

    console.log(`Started polling every ${this.pollInterval}ms`);
  }

  /**
   * Check if we're approaching the execution timeout
   */
  isApproachingTimeout() {
    if (!this.startTime) return false;
    
    const elapsed = Date.now() - this.startTime;
    const timeRemaining = this.maxExecutionTime - elapsed;
    
    // Stop if we have less than 30 seconds remaining
    return timeRemaining < 30000;
  }

  /**
   * Check if the worker is currently running
   */
  isRunning() {
    return this._running;
  }

  /**
   * Process the next available job
   */
  async processNextJob() {
    try {
      // Get pending jobs (limit to 1 to process one at a time)
      const pendingJobs = await jobQueue.getPendingJobs(1);
      
      if (pendingJobs.length === 0) {
        return false; // No jobs to process
      }

      const job = pendingJobs[0];
      
      // Check if we're already processing this job
      if (this.processingJobs.has(job.jobId)) {
        return false;
      }

      // Check if user is already locked
      const isUserLocked = await userLock.isUserLocked(job.userId);
      if (isUserLocked) {
        console.log(`User ${job.userId} is already locked, skipping job ${job.jobId}`);
        return false;
      }

      // Start processing this job
      this.processingJobs.add(job.jobId);
      console.log(`Starting to process job ${job.jobId} for user ${job.userId}`);

      // Process job in background (don't await to allow concurrent processing)
      this.processJob(job).catch(error => {
        console.error(`Error processing job ${job.jobId}:`, error);
      });

      return true; // Job started processing

    } catch (error) {
      console.error('Error getting pending jobs:', error);
      return false;
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    const startTime = Date.now();
    
    try {
      // Lock the user
      await userLock.lockUser(job.userId, Math.ceil(this.maxJobProcessingTime / 1000)); // Convert to seconds
      console.log(`Locked user ${job.userId} for job ${job.jobId}`);

      // Update job status to processing
      await jobQueue.updateJobStatus(job.jobId, 'processing');
      console.log(`Updated job ${job.jobId} status to processing`);

      // Process with Crucible AI
      const crucibleResponse = await this.processWithCrucible(job.prompt);
      
      // Route response to appropriate channel
      await this.responseRouter.routeResponse(job, crucibleResponse, {
        processingTime: Date.now() - startTime
      });

      // Update job status to completed
      await jobQueue.updateJobStatus(job.jobId, 'completed', {
        response: crucibleResponse,
        completedAt: Date.now(),
        processingTime: Date.now() - startTime
      });
      console.log(`Completed job ${job.jobId} in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error(`Error processing job ${job.jobId}:`, error);
      
      // Update job status to failed
      await jobQueue.updateJobStatus(job.jobId, 'failed', {
        error: error.message,
        failedAt: Date.now(),
        processingTime: Date.now() - startTime
      });

      // Route error response to appropriate channel
      await this.responseRouter.routeErrorResponse(job, error.message);
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
      
      // Add timeout to prevent hanging (5 minutes max per job)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI processing timeout')), this.maxJobProcessingTime);
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
   * Get worker status
   */
  getStatus() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const timeRemaining = this.maxExecutionTime - elapsed;
    
    return {
      isRunning: this.isRunning,
      processingJobs: Array.from(this.processingJobs),
      processingCount: this.processingJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      pollInterval: this.pollInterval,
      elapsedTime: elapsed,
      timeRemaining: Math.max(0, timeRemaining),
      approachingTimeout: this.isApproachingTimeout()
    };
  }
}

module.exports = AsyncWorker; 