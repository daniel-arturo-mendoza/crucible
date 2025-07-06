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
 * @returns {Promise<string>} jobId
 */
async function enqueueJob(jobData) {
  const jobId = uuidv4();
  const now = Date.now();
  const ttl = Math.floor(now / 1000) + 10 * 60; // 10 min TTL
  const item = {
    jobId,
    status: 'pending',
    createdAt: now,
    ttl,
    ...jobData
  };
  await client.send(new PutCommand({
    TableName: JOB_QUEUE_TABLE,
    Item: item
  }));
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
}

/**
 * Get pending jobs (optionally limit)
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
async function getPendingJobs(limit = 10) {
  const now = Date.now();
  const result = await client.send(new QueryCommand({
    TableName: JOB_QUEUE_TABLE,
    IndexName: 'StatusCreatedAtIndex',
    KeyConditionExpression: '#status = :pending and #createdAt <= :now',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#createdAt': 'createdAt'
    },
    ExpressionAttributeValues: {
      ':pending': 'pending',
      ':now': now
    },
    Limit: limit
  }));
  return result.Items || [];
}

module.exports = {
  enqueueJob,
  getJob,
  updateJobStatus,
  getPendingJobs
}; 