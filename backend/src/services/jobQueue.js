const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const JOB_QUEUE_TABLE = process.env.JOB_QUEUE_TABLE;
const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  endpoint: process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000',
  region: 'local'
}));

/**
 * Enqueue a new job
 * @param {object} jobData
 * @param {string} jobData.channel - 'mobile' or 'whatsapp'
 * @param {string} jobData.userId - User identifier
 * @param {string} jobData.prompt - User's question
 * @param {object} jobData.channelData - Channel-specific data
 * @returns {Promise<string>} jobId
 */
async function enqueueJob(jobData) {
  const jobId = uuidv4();
  const now = Date.now();
  const ttl = Math.floor(now / 1000) + 10 * 60; // 10 min TTL
  
  // Validate required fields
  if (!jobData.channel || !jobData.userId || !jobData.prompt) {
    throw new Error('Missing required fields: channel, userId, prompt');
  }
  
  // Validate channel
  if (!['mobile', 'whatsapp'].includes(jobData.channel)) {
    throw new Error('Invalid channel. Must be "mobile" or "whatsapp"');
  }
  
  const item = {
    jobId,
    status: 'pending',
    createdAt: now,
    ttl,
    channel: jobData.channel,
    userId: jobData.userId,
    prompt: jobData.prompt,
    channelData: jobData.channelData || {},
    priority: jobData.priority || 'normal'
  };
  
  await client.send(new PutCommand({
    TableName: JOB_QUEUE_TABLE,
    Item: item
  }));
  
  console.log(`Enqueued job ${jobId} for ${jobData.channel} channel`);
  return jobId;
}

/**
 * Get a job by jobId
 * @param {string} jobId
 * @returns {Promise<object|null>}
 */
async function getJob(jobId) {
  const result = await client.send(new GetCommand({
    TableName: JOB_QUEUE_TABLE,
    Key: { jobId }
  }));
  return result.Item || null;
}

/**
 * Update job status (and optionally result)
 * @param {string} jobId
 * @param {string} status
 * @param {object} [result]
 */
async function updateJobStatus(jobId, status, result) {
  const update = {
    TableName: JOB_QUEUE_TABLE,
    Key: { jobId },
    UpdateExpression: 'set #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': Date.now()
    }
  };
  
  if (result) {
    update.UpdateExpression += ', #result = :result';
    update.ExpressionAttributeNames['#result'] = 'result';
    update.ExpressionAttributeValues[':result'] = result;
  }
  
  await client.send(new UpdateCommand(update));
  console.log(`Updated job ${jobId} status to ${status}`);
}

/**
 * Get pending jobs (optionally limit)
 * @param {number} [limit=10]
 * @param {string} [channel] - Optional channel filter
 * @returns {Promise<object[]>}
 */
async function getPendingJobs(limit = 10, channel = null) {
  const now = Date.now();
  
  let keyConditionExpression = '#status = :pending and #createdAt <= :now';
  let expressionAttributeNames = {
    '#status': 'status',
    '#createdAt': 'createdAt'
  };
  let expressionAttributeValues = {
    ':pending': 'pending',
    ':now': now
  };
  
  // Add channel filter if specified
  if (channel) {
    keyConditionExpression += ' and #channel = :channel';
    expressionAttributeNames['#channel'] = 'channel';
    expressionAttributeValues[':channel'] = channel;
  }
  
  const result = await client.send(new QueryCommand({
    TableName: JOB_QUEUE_TABLE,
    IndexName: 'StatusCreatedAtIndex',
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    Limit: limit
  }));
  
  return result.Items || [];
}

/**
 * Get jobs by user ID
 * @param {string} userId
 * @param {number} [limit=20]
 * @returns {Promise<object[]>}
 */
async function getJobsByUser(userId, limit = 20) {
  const result = await client.send(new QueryCommand({
    TableName: JOB_QUEUE_TABLE,
    IndexName: 'UserIdCreatedAtIndex',
    KeyConditionExpression: '#userId = :userId',
    ExpressionAttributeNames: {
      '#userId': 'userId'
    },
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit
  }));
  
  return result.Items || [];
}

/**
 * Get jobs by channel
 * @param {string} channel
 * @param {number} [limit=20]
 * @returns {Promise<object[]>}
 */
async function getJobsByChannel(channel, limit = 20) {
  const result = await client.send(new QueryCommand({
    TableName: JOB_QUEUE_TABLE,
    IndexName: 'ChannelCreatedAtIndex',
    KeyConditionExpression: '#channel = :channel',
    ExpressionAttributeNames: {
      '#channel': 'channel'
    },
    ExpressionAttributeValues: {
      ':channel': channel
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit
  }));
  
  return result.Items || [];
}

module.exports = {
  enqueueJob,
  getJob,
  updateJobStatus,
  getPendingJobs,
  getJobsByUser,
  getJobsByChannel
}; 