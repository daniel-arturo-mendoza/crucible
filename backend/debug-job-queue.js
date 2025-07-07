// Set test environment BEFORE requiring modules
process.env.NODE_ENV = 'test';
process.env.JOB_QUEUE_TABLE = 'crucible-job-queue';
process.env.AWS_REGION = 'local';
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';

const jobQueue = require('./src/services/jobQueue');

async function debugJobQueue() {
  console.log('🔍 Debugging job queue operations...');
  console.log('Environment variables:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  JOB_QUEUE_TABLE:', process.env.JOB_QUEUE_TABLE);
  console.log('  AWS_REGION:', process.env.AWS_REGION);
  
  try {
    // Test 1: Enqueue a job
    console.log('\n1. Enqueueing a test job...');
    const jobId = await jobQueue.enqueueJob({
      userId: 'test-user-1',
      prompt: 'Debug test question',
      channel: 'mobile'
    });
    console.log(`✅ Job enqueued with ID: ${jobId}`);
    
    // Test 2: Get the job
    console.log('\n2. Getting the job...');
    const job = await jobQueue.getJob(jobId);
    console.log('✅ Job retrieved:', {
      jobId: job.jobId,
      status: job.status,
      userId: job.userId,
      prompt: job.prompt,
      channel: job.channel,
      createdAt: job.createdAt
    });
    
    // Test 3: Get pending jobs
    console.log('\n3. Getting pending jobs...');
    const pendingJobs = await jobQueue.getPendingJobs(10);
    console.log(`✅ Found ${pendingJobs.length} pending jobs:`);
    pendingJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.jobId} - ${job.status} - ${job.userId}`);
    });
    
    // Test 4: Update job status
    console.log('\n4. Updating job status to processing...');
    await jobQueue.updateJobStatus(jobId, 'processing');
    console.log('✅ Job status updated');
    
    // Test 5: Get pending jobs again (should be 0)
    console.log('\n5. Getting pending jobs after update...');
    const pendingJobsAfter = await jobQueue.getPendingJobs(10);
    console.log(`✅ Found ${pendingJobsAfter.length} pending jobs after update`);
    
    // Test 6: Update job status to completed
    console.log('\n6. Updating job status to completed...');
    await jobQueue.updateJobStatus(jobId, 'completed', {
      response: 'Test response from AI',
      completedAt: Date.now()
    });
    console.log('✅ Job completed');
    
    // Test 7: Get the final job
    console.log('\n7. Getting final job...');
    const finalJob = await jobQueue.getJob(jobId);
    console.log('✅ Final job:', {
      jobId: finalJob.jobId,
      status: finalJob.status,
      response: finalJob.result?.response
    });
    
    // Test 8: Clean up
    console.log('\n8. Cleaning up...');
    await jobQueue.deleteJob(jobId);
    console.log('✅ Job deleted');
    
    console.log('\n🎉 All job queue operations working correctly!');
    
  } catch (error) {
    console.error('❌ Error in job queue operations:', error);
    throw error;
  }
}

// Run the debug
debugJobQueue().catch(console.error); 