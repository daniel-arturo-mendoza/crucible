const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JOB_QUEUE_TABLE = 'crucible-job-queue';
process.env.AWS_REGION = 'local';
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';

const client = new DynamoDBDocumentClient(new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
}));

async function debugJobs() {
  console.log('🔍 Debugging job storage and retrieval...');
  
  const testJobId = 'debug-test-job-' + Date.now();
  const testUserId = 'debug-test-user-' + Date.now();
  
  // Test job data
  const testJob = {
    jobId: testJobId,
    status: 'pending',
    createdAt: Date.now(),
    ttl: Math.floor(Date.now() / 1000) + 600, // 10 min TTL
    channel: 'mobile',
    userId: testUserId,
    prompt: 'Debug test question',
    channelData: {},
    priority: 'normal'
  };
  
  try {
    // 1. Store a test job
    console.log('📝 Storing test job...');
    await client.send(new PutCommand({
      TableName: 'crucible-job-queue',
      Item: testJob
    }));
    console.log('✅ Job stored successfully');
    
    // 2. Retrieve the job by jobId
    console.log('🔍 Retrieving job by jobId...');
    const getResult = await client.send(new GetCommand({
      TableName: 'crucible-job-queue',
      Key: { jobId: testJobId }
    }));
    
    if (getResult.Item) {
      console.log('✅ Job retrieved successfully:', getResult.Item);
    } else {
      console.log('❌ Job not found by jobId');
    }
    
    // 3. Query jobs by userId
    console.log('🔍 Querying jobs by userId...');
    const queryResult = await client.send(new QueryCommand({
      TableName: 'crucible-job-queue',
      IndexName: 'UserIdCreatedAtIndex',
      KeyConditionExpression: '#userId = :userId',
      ExpressionAttributeNames: {
        '#userId': 'userId'
      },
      ExpressionAttributeValues: {
        ':userId': testUserId
      }
    }));
    
    console.log('📊 Jobs found by userId:', queryResult.Items?.length || 0);
    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log('✅ Jobs found:', queryResult.Items);
    } else {
      console.log('❌ No jobs found by userId');
    }
    
    // 4. Query pending jobs
    console.log('🔍 Querying pending jobs...');
    const pendingResult = await client.send(new QueryCommand({
      TableName: 'crucible-job-queue',
      IndexName: 'StatusCreatedAtIndex',
      KeyConditionExpression: '#status = :pending and #createdAt <= :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#createdAt': 'createdAt'
      },
      ExpressionAttributeValues: {
        ':pending': 'pending',
        ':now': Date.now()
      }
    }));
    
    console.log('📊 Pending jobs found:', pendingResult.Items?.length || 0);
    if (pendingResult.Items && pendingResult.Items.length > 0) {
      console.log('✅ Pending jobs found:', pendingResult.Items);
    } else {
      console.log('❌ No pending jobs found');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugJobs().catch(console.error); 