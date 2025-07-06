const AsyncWorker = require('./src/services/asyncWorker');
const jobQueue = require('./src/services/jobQueue');

// Test the unified AsyncWorker
async function testUnifiedWorker() {
  console.log('🧪 Testing Unified AsyncWorker\n');

  // Create worker with shorter timeouts for testing
  const worker = new AsyncWorker({
    maxExecutionTime: 60000, // 1 minute for testing
    maxJobProcessingTime: 30000, // 30 seconds per job
    pollInterval: 2000, // 2 seconds
    maxConcurrentJobs: 2
  });

  console.log('📊 Initial worker status:');
  console.log(JSON.stringify(worker.getStatus(), null, 2));

  // Start the worker
  console.log('\n🚀 Starting worker...');
  await worker.start();

  console.log('\n📊 Worker status after start:');
  console.log(JSON.stringify(worker.getStatus(), null, 2));

  // Simulate some time passing
  console.log('\n⏰ Waiting 10 seconds to see polling in action...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n📊 Worker status after 10 seconds:');
  console.log(JSON.stringify(worker.getStatus(), null, 2));

  // Stop the worker
  console.log('\n🛑 Stopping worker...');
  worker.stop();

  console.log('\n📊 Final worker status:');
  console.log(JSON.stringify(worker.getStatus(), null, 2));

  console.log('\n✅ Test completed!');
}

// Test timeout handling
async function testTimeoutHandling() {
  console.log('\n⏰ Testing timeout handling...\n');

  const worker = new AsyncWorker({
    maxExecutionTime: 10000, // 10 seconds
    pollInterval: 1000, // 1 second
  });

  await worker.start();

  // Wait for timeout to trigger
  console.log('Waiting for timeout to trigger...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log('📊 Worker status after timeout:');
  console.log(JSON.stringify(worker.getStatus(), null, 2));
}

// Run tests
async function runTests() {
  try {
    await testUnifiedWorker();
    await testTimeoutHandling();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testUnifiedWorker, testTimeoutHandling }; 