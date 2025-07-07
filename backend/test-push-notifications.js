const PushNotificationService = require('./src/services/pushNotification');
const UserManager = require('./src/services/userManager');
const jobQueue = require('./src/services/jobQueue');
const ResponseRouter = require('./src/services/responseRouter');

// Test push notification functionality
async function testPushNotifications() {
  console.log('🧪 Testing Push Notification System\n');

  const pushService = new PushNotificationService();
  const userManager = new UserManager();
  const responseRouter = new ResponseRouter();

  // Test 1: Check Firebase initialization
  console.log('🔥 Test 1: Firebase Initialization');
  console.log(`Firebase available: ${pushService.isAvailable()}`);
  
  if (!pushService.isAvailable()) {
    console.log('⚠️  Firebase not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    console.log('Continuing with simulated tests...\n');
  }

  // Test 2: Register FCM token
  console.log('📱 Test 2: FCM Token Registration');
  const testUserId = 'mobile:testuser123';
  const testFCMToken = 'test-fcm-token-123456';
  
  try {
    await userManager.registerFCMToken(testUserId, testFCMToken, {
      appVersion: '1.0.0',
      deviceId: 'test-device-123',
      platform: 'ios'
    });
    console.log('✅ FCM token registered successfully');
  } catch (error) {
    console.error('❌ Error registering FCM token:', error.message);
  }

  // Test 3: Create mobile job
  console.log('\n📋 Test 3: Create Mobile Job');
  const mobileJob = await jobQueue.enqueueJob({
    channel: 'mobile',
    userId: testUserId,
    prompt: 'What is artificial intelligence?',
    channelData: {
      appVersion: '1.0.0',
      deviceId: 'test-device-123'
    },
    priority: 'high'
  });
  console.log(`✅ Created mobile job: ${mobileJob}`);

  // Test 4: Simulate job completion with push notification
  console.log('\n🔔 Test 4: Job Completion with Push Notification');
  
  // Complete the job
  await jobQueue.updateJobStatus(mobileJob, 'completed', {
    response: 'Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that work and react like humans...',
    completedAt: Date.now(),
    processingTime: 45000
  });

  // Get the completed job
  const completedJob = await jobQueue.getJob(mobileJob);
  
  // Route response (this will trigger push notification)
  console.log('Routing response to mobile app...');
  await responseRouter.routeResponse(completedJob, 'Artificial Intelligence (AI) is a branch of computer science...');

  // Test 5: Test error notification
  console.log('\n❌ Test 5: Error Notification');
  
  const errorJob = await jobQueue.enqueueJob({
    channel: 'mobile',
    userId: testUserId,
    prompt: 'This will cause an error',
    channelData: {
      appVersion: '1.0.0',
      deviceId: 'test-device-123'
    }
  });

  // Simulate job failure
  await jobQueue.updateJobStatus(errorJob, 'failed', {
    error: 'AI processing timeout',
    failedAt: Date.now()
  });

  const failedJob = await jobQueue.getJob(errorJob);
  
  console.log('Routing error response to mobile app...');
  await responseRouter.routeErrorResponse(failedJob, 'AI processing timeout');

  // Test 6: Push notification preferences
  console.log('\n⚙️  Test 6: Push Notification Preferences');
  
  try {
    await userManager.updatePushNotificationPreferences(testUserId, false);
    console.log('✅ Push notifications disabled');
    
    await userManager.updatePushNotificationPreferences(testUserId, true);
    console.log('✅ Push notifications enabled');
  } catch (error) {
    console.error('❌ Error updating preferences:', error.message);
  }

  // Test 7: Get user data
  console.log('\n👤 Test 7: Get User Data');
  
  try {
    const user = await userManager.getUser(testUserId);
    console.log('User data:', {
      userId: user.userId,
      fcmToken: user.fcmToken ? '***' + user.fcmToken.slice(-4) : null,
      pushNotificationsEnabled: user.pushNotificationsEnabled,
      appVersion: user.appVersion,
      platform: user.platform
    });
  } catch (error) {
    console.error('❌ Error getting user data:', error.message);
  }

  console.log('\n✅ Push notification tests completed!');
}

// Test Firebase configuration
async function testFirebaseConfig() {
  console.log('\n🔥 Testing Firebase Configuration\n');
  
  const pushService = new PushNotificationService();
  
  if (pushService.isAvailable()) {
    console.log('✅ Firebase is properly configured');
    console.log('You can now send real push notifications');
  } else {
    console.log('❌ Firebase is not configured');
    console.log('\nTo configure Firebase:');
    console.log('1. Create a Firebase project at https://console.firebase.google.com');
    console.log('2. Download your service account key (Project Settings > Service Accounts)');
    console.log('3. Set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable:');
    console.log('   export FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
  }
}

// Run tests
async function runTests() {
  try {
    await testPushNotifications();
    await testFirebaseConfig();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testPushNotifications, testFirebaseConfig }; 