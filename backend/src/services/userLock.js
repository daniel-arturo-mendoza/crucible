const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const USER_LOCKS_TABLE = process.env.USER_LOCKS_TABLE;
const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  endpoint: process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000',
  region: 'local'
}));

/**
 * Lock a user for a given TTL (in seconds)
 * @param {string} userId
 * @param {number} ttlSeconds
 */
async function lockUser(userId, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + ttlSeconds;
  await client.send(new PutCommand({
    TableName: USER_LOCKS_TABLE,
    Item: {
      userId,
      status: 'locked',
      ttl
    }
  }));
}

/**
 * Check if a user is locked
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isUserLocked(userId) {
  const result = await client.send(new GetCommand({
    TableName: USER_LOCKS_TABLE,
    Key: { userId }
  }));
  if (!result.Item) return false;
  // Check TTL
  const now = Math.floor(Date.now() / 1000);
  return result.Item.status === 'locked' && result.Item.ttl > now;
}

/**
 * Unlock a user (delete lock)
 * @param {string} userId
 */
async function unlockUser(userId) {
  await client.send(new DeleteCommand({
    TableName: USER_LOCKS_TABLE,
    Key: { userId }
  }));
}

module.exports = {
  lockUser,
  isUserLocked,
  unlockUser,
  DEFAULT_TTL_SECONDS
}; 