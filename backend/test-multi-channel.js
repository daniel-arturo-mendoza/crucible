const jobQueue = require('./src/services/jobQueue');
const ResponseRouter = require('./src/services/responseRouter');

// Test multi-channel functionality
async function testMultiChannel() {
  console.log('🧪 Testing Multi-Channel Job Processing\n');

  const responseRouter = new ResponseRouter();

  // Test 1: WhatsApp Job
  console.log('📱 Test 1: WhatsApp Job');
  const whatsappJob = await jobQueue.enqueueJob({
    channel: 'whatsapp',
    userId: 'whatsapp:+1234567890',
    prompt: 'What is quantum computing?',
    channelData: {
      phoneNumber: '+1234567890'
    },
    priority: 'normal'
  });
  console.log(`Created WhatsApp job: ${whatsappJob}`);

  // Test 2: Mobile App Job
  console.log('\n📱 Test 2: Mobile App Job');
  const mobileJob = await jobQueue.enqueueJob({
    channel: 'mobile',
    userId: 'mobile:user123',
    prompt: 'Explain machine learning',
    channelData: {
      appVersion: '1.0.0',
      deviceId: 'device123'
    },
    priority: 'high'
  });
  console.log(`Created mobile job: ${mobileJob}`);

  // Test 3: Get Pending Jobs
  console.log('\n📋 Test 3: Get Pending Jobs');
  const pendingJobs = await jobQueue.getPendingJobs(10);
  console.log(`Found ${pendingJobs.length} pending jobs:`);
  pendingJobs.forEach(job => {
    console.log(`  - ${job.jobId} (${job.channel}): ${job.prompt.substring(0, 30)}...`);
  });

  // Test 4: Get Jobs by Channel
  console.log('\n📱 Test 4: Get Jobs by Channel');
  const whatsappJobs = await jobQueue.getJobsByChannel('whatsapp', 5);
  const mobileJobs = await jobQueue.getJobsByChannel('mobile', 5);
  console.log(`WhatsApp jobs: ${whatsappJobs.length}`);
  console.log(`Mobile jobs: ${mobileJobs.length}`);

  // Test 5: Get Jobs by User
  console.log('\n👤 Test 5: Get Jobs by User');
  const userJobs = await jobQueue.getJobsByUser('mobile:user123', 10);
  console.log(`User mobile:user123 has ${userJobs.length} jobs`);

  // Test 6: Simulate Job Completion
  console.log('\n✅ Test 6: Simulate Job Completion');
  
  // Complete WhatsApp job
  const whatsappJobData = await jobQueue.getJob(whatsappJob);
  await jobQueue.updateJobStatus(whatsappJob, 'completed', {
    response: 'Quantum computing is a revolutionary technology...',
    completedAt: Date.now(),
    processingTime: 45000
  });
  
  // Complete mobile job
  const mobileJobData = await jobQueue.getJob(mobileJob);
  await jobQueue.updateJobStatus(mobileJob, 'completed', {
    response: 'Machine learning is a subset of artificial intelligence...',
    completedAt: Date.now(),
    processingTime: 32000
  });

  console.log('Jobs completed successfully');

  // Test 7: Response Routing (simulation)
  console.log('\n🔄 Test 7: Response Routing Simulation');
  
  const completedWhatsappJob = await jobQueue.getJob(whatsappJob);
  const completedMobileJob = await jobQueue.getJob(mobileJob);
  
  console.log('WhatsApp job routing:');
  await responseRouter.routeResponse(completedWhatsappJob, 'Quantum computing response...');
  
  console.log('Mobile job routing:');
  await responseRouter.routeResponse(completedMobileJob, 'Machine learning response...');

  console.log('\n✅ Multi-channel test completed!');
}

// Test error handling
async function testErrorHandling() {
  console.log('\n❌ Testing Error Handling\n');

  const responseRouter = new ResponseRouter();

  // Create a job that will have an error
  const errorJob = await jobQueue.enqueueJob({
    channel: 'whatsapp',
    userId: 'whatsapp:+1234567890',
    prompt: 'This will cause an error',
    channelData: {
      phoneNumber: '+1234567890'
    }
  });

  // Simulate job failure
  await jobQueue.updateJobStatus(errorJob, 'failed', {
    error: 'AI processing timeout',
    failedAt: Date.now()
  });

  const failedJob = await jobQueue.getJob(errorJob);
  
  console.log('Routing error response:');
  await responseRouter.routeErrorResponse(failedJob, 'AI processing timeout');
}

// Run tests
async function runTests() {
  try {
    await testMultiChannel();
    await testErrorHandling();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testMultiChannel, testErrorHandling }; 