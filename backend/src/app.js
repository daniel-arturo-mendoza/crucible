const express = require('express');
const cors = require('cors');
const path = require('path');
const { CrucibleCore } = require('../../crucible-core/src/index');
const TwilioService = require('./services/twilio');
const userLock = require('./services/userLock');
const jobQueue = require('./services/jobQueue');
const AsyncWorker = require('./services/asyncWorker');

const app = express();

// Initialize Crucible Core
const crucible = new CrucibleCore({
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
    configPath: path.join(__dirname, '../crucible-synthesis-config.json')
  }
});

// Initialize Twilio Service
const twilioService = new TwilioService();

// Initialize Async Worker
const asyncWorker = new AsyncWorker();

// Middleware: CORS
app.use(cors());

// Middleware: JSON body parsing
app.use(express.json());

// Middleware: URL-encoded form data parsing (for Twilio webhooks)
app.use(express.urlencoded({ extended: true }));

// Middleware: Logging
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test OpenAI endpoint
app.post('/test-openai', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await crucible.querySingle(prompt, 'openai');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Test DeepSeek endpoint
app.post('/test-deepseek', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await crucible.querySingle(prompt, 'deepseek');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Query endpoint - get responses from all providers without synthesis
app.post('/query', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Query all providers in parallel
    const result = await crucible.query(prompt, ['openai', 'deepseek']);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Query and synthesize endpoint
app.post('/query-and-synthesize', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Query all providers and synthesize the results
    const result = await crucible.queryAndSynthesize(prompt, ['openai', 'deepseek']);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get available providers
app.get('/providers', (req, res) => {
  const providers = crucible.getProviders();
  res.json({ providers });
});

// Test endpoint for DynamoDB configuration
app.get('/test-config', (req, res) => {
  res.json({
    environment: {
      USER_LOCKS_TABLE: process.env.USER_LOCKS_TABLE,
      JOB_QUEUE_TABLE: process.env.JOB_QUEUE_TABLE,
      TWILIO_CONFIGURED: !!process.env.TWILIO_ACCOUNT_SID,
      OPENAI_CONFIGURED: !!process.env.OPENAI_API_KEY,
      DEEPSEEK_CONFIGURED: !!process.env.DEEPSEEK_API_KEY
    },
    message: 'Configuration test endpoint'
  });
});

// WhatsApp endpoints
// Send WhatsApp message
app.post('/whatsapp/send', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number (to) and message are required' });
    }

    if (!twilioService.isConfigured()) {
      return res.status(500).json({ error: 'Twilio is not properly configured' });
    }

    if (!twilioService.isValidPhoneNumber(to)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use international format (e.g., +1234567890)' });
    }

    const result = await twilioService.sendWhatsAppMessage(to, message);
    res.json({ 
      success: true, 
      messageSid: result.sid,
      message: 'WhatsApp message sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Send WhatsApp message with Crucible AI response
app.post('/whatsapp/crucible', async (req, res, next) => {
  try {
    const { to, prompt, providers = ['openai', 'deepseek'], synthesize = true } = req.body;
    
    if (!to || !prompt) {
      return res.status(400).json({ error: 'Phone number (to) and prompt are required' });
    }

    if (!twilioService.isConfigured()) {
      return res.status(500).json({ error: 'Twilio is not properly configured' });
    }

    if (!twilioService.isValidPhoneNumber(to)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use international format (e.g., +1234567890)' });
    }

    // Get Crucible response
    let crucibleResponse;
    if (synthesize) {
      crucibleResponse = await crucible.queryAndSynthesize(prompt, providers);
    } else {
      crucibleResponse = await crucible.query(prompt, providers);
    }

    // Send WhatsApp message with the response
    const result = await twilioService.sendCrucibleResponse(to, prompt, crucibleResponse);
    
    res.json({ 
      success: true, 
      messageSid: result.sid,
      crucibleResponse,
      message: 'WhatsApp message with Crucible AI response sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Webhook endpoint for incoming WhatsApp messages
app.post('/whatsapp/webhook', async (req, res, next) => {
  try {
    console.log('Full webhook request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { Body, From, To } = req.body;
    
    console.log('Incoming WhatsApp message:', { Body, From, To });
    
    // Validate that this is a WhatsApp message
    if (!Body || !From) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const prompt = Body.trim();
    const senderNumber = From.replace('whatsapp:', '');
    const userId = `whatsapp:${senderNumber}`;

    // Check if user is already locked (processing another request)
    const isUserLocked = await userLock.isUserLocked(userId);
    if (isUserLocked) {
      console.log(`User ${userId} is already locked, sending busy message`);
      await twilioService.sendWhatsAppMessage(senderNumber, 'I\'m still processing your previous request. Please wait a moment before sending another message.');
      return res.json({ 
        success: true, 
        message: 'User is busy, sent busy message'
      });
    }

    // Enqueue the job for async processing
    const jobData = {
      userId,
      prompt,
      channel: 'whatsapp',
      channelData: {
        phoneNumber: senderNumber
      },
      priority: 'normal'
    };

    const jobId = await jobQueue.enqueueJob(jobData);
    console.log(`Enqueued job ${jobId} for user ${userId}`);

    // Send immediate acknowledgment
    await twilioService.sendWhatsAppMessage(senderNumber, '🤖 I\'m processing your question. You\'ll receive my response shortly!');
    
    res.json({ 
      success: true, 
      jobId,
      message: 'WhatsApp message enqueued for async processing'
    });
  } catch (err) {
    console.error('Error in WhatsApp webhook:', err);
    next(err);
  }
});

// Mobile App Endpoints
// Submit question from mobile app
app.post('/mobile/question', async (req, res, next) => {
  try {
    const { userId, prompt, priority = 'normal' } = req.body;
    
    if (!userId || !prompt) {
      return res.status(400).json({ error: 'userId and prompt are required' });
    }

    // Check if user is already locked (processing another request)
    const isUserLocked = await userLock.isUserLocked(userId);
    if (isUserLocked) {
      return res.status(429).json({ 
        error: 'User is busy processing another request',
        message: 'Please wait a moment before sending another question'
      });
    }

    // Enqueue the job for async processing
    const jobData = {
      userId,
      prompt,
      channel: 'mobile',
      channelData: {
        // Add any mobile-specific data here
        appVersion: req.body.appVersion,
        deviceId: req.body.deviceId
      },
      priority
    };

    const jobId = await jobQueue.enqueueJob(jobData);
    console.log(`Enqueued mobile job ${jobId} for user ${userId}`);

    res.json({ 
      success: true, 
      jobId,
      message: 'Question submitted for processing',
      status: 'pending'
    });
  } catch (err) {
    console.error('Error in mobile question endpoint:', err);
    next(err);
  }
});

// Register FCM token for push notifications
app.post('/mobile/register-token', async (req, res, next) => {
  try {
    const { userId, fcmToken, appVersion, deviceId, platform } = req.body;
    
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'userId and fcmToken are required' });
    }

    const UserManager = require('./services/userManager');
    const userManager = new UserManager();

    // Register or update FCM token
    await userManager.registerFCMToken(userId, fcmToken, {
      appVersion,
      deviceId,
      platform,
      lastActivity: Date.now()
    });

    res.json({ 
      success: true, 
      message: 'FCM token registered successfully',
      pushNotificationsEnabled: true
    });
  } catch (err) {
    console.error('Error registering FCM token:', err);
    next(err);
  }
});

// Update push notification preferences
app.post('/mobile/push-preferences', async (req, res, next) => {
  try {
    const { userId, enabled } = req.body;
    
    if (!userId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'userId and enabled (boolean) are required' });
    }

    const UserManager = require('./services/userManager');
    const userManager = new UserManager();

    // Update push notification preferences
    await userManager.updatePushNotificationPreferences(userId, enabled);

    res.json({ 
      success: true, 
      message: `Push notifications ${enabled ? 'enabled' : 'disabled'}`,
      pushNotificationsEnabled: enabled
    });
  } catch (err) {
    console.error('Error updating push preferences:', err);
    next(err);
  }
});

// Unregister FCM token
app.delete('/mobile/unregister-token', async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const UserManager = require('./services/userManager');
    const userManager = new UserManager();

    // Remove FCM token
    await userManager.removeFCMToken(userId);

    res.json({ 
      success: true, 
      message: 'FCM token unregistered successfully'
    });
  } catch (err) {
    console.error('Error unregistering FCM token:', err);
    next(err);
  }
});

// Get job status (for mobile app polling)
app.get('/mobile/job/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.query; // Optional: verify user owns this job
    
    const job = await jobQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Optional: verify user owns this job
    if (userId && job.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      job: {
        jobId: job.jobId,
        status: job.status,
        prompt: job.prompt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        result: job.result,
        channel: job.channel
      }
    });
  } catch (err) {
    console.error('Error getting job status:', err);
    next(err);
  }
});

// Get user's job history (for mobile app)
app.get('/mobile/jobs/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 20, status } = req.query;
    
    let jobs = await jobQueue.getJobsByUser(userId, parseInt(limit));
    
    // Filter by status if specified
    if (status) {
      jobs = jobs.filter(job => job.status === status);
    }

    res.json({
      success: true,
      jobs: jobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        prompt: job.prompt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        result: job.result,
        channel: job.channel
      }))
    });
  } catch (err) {
    console.error('Error getting user jobs:', err);
    next(err);
  }
});

// User Locking Test Endpoints (for local DynamoDB testing)
app.post('/lock-test/lock', async (req, res) => {
  const { userId, ttlSeconds } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    await userLock.lockUser(userId, ttlSeconds);
    res.json({ success: true, message: `User ${userId} locked.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/lock-test/status/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const locked = await userLock.isUserLocked(userId);
    res.json({ userId, locked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/lock-test/unlock', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    await userLock.unlockUser(userId);
    res.json({ success: true, message: `User ${userId} unlocked.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Job Queue Test Endpoints (for local DynamoDB testing)
app.post('/job-test/enqueue', async (req, res) => {
  try {
    const jobId = await jobQueue.enqueueJob(req.body);
    res.json({ success: true, jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/job-test/pending', async (req, res) => {
  try {
    const jobs = await jobQueue.getPendingJobs(10);
    console.log('getPendingJobs returned:', jobs);
    console.log('typeof jobs:', typeof jobs);
    console.log('jobs.length:', jobs ? jobs.length : 'null/undefined');
    res.json({ jobs });
  } catch (err) {
    console.error('Error in /job-test/pending:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/job-test/:jobId', async (req, res) => {
  try {
    const job = await jobQueue.getJob(req.params.jobId);
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/job-test/update', async (req, res) => {
  const { jobId, status, result } = req.body;
  if (!jobId || !status) return res.status(400).json({ error: 'jobId and status required' });
  try {
    await jobQueue.updateJobStatus(jobId, status, result);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Async Worker Control Endpoints
app.post('/worker/start', async (req, res) => {
  try {
    await asyncWorker.start();
    res.json({ success: true, message: 'Async worker started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/worker/stop', async (req, res) => {
  try {
    asyncWorker.stop();
    res.json({ success: true, message: 'Async worker stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/worker/status', async (req, res) => {
  try {
    const status = asyncWorker.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual job processing endpoint (for testing and debugging)
app.post('/worker/process', async (req, res) => {
  try {
    const { maxJobs = 5 } = req.body;
    let processedCount = 0;
    
    // Process jobs manually
    for (let i = 0; i < maxJobs; i++) {
      const processed = await asyncWorker.processNextJob();
      if (processed) {
        processedCount++;
      } else {
        break; // No more jobs to process
      }
    }
    
    res.json({ 
      success: true, 
      processedCount,
      message: `Processed ${processedCount} jobs`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

module.exports = app;
