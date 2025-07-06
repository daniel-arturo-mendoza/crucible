const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const USERS_TABLE = process.env.USERS_TABLE || 'crucible-users';
const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  endpoint: process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000',
  region: 'local'
}));

class UserManager {
  /**
   * Register or update user's FCM token
   * @param {string} userId - User ID
   * @param {string} fcmToken - Firebase Cloud Messaging token
   * @param {object} userData - Additional user data
   */
  async registerFCMToken(userId, fcmToken, userData = {}) {
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + 365 * 24 * 60 * 60; // 1 year TTL

    const item = {
      userId,
      fcmToken,
      createdAt: now,
      updatedAt: now,
      ttl,
      pushNotificationsEnabled: true,
      ...userData
    };

    await client.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: item
    }));

    console.log(`Registered FCM token for user ${userId}`);
    return item;
  }

  /**
   * Get user data including FCM token
   * @param {string} userId - User ID
   * @returns {Promise<object|null>}
   */
  async getUser(userId) {
    const result = await client.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    return result.Item || null;
  }

  /**
   * Get user's FCM token
   * @param {string} userId - User ID
   * @returns {Promise<string|null>}
   */
  async getFCMToken(userId) {
    const user = await this.getUser(userId);
    return user?.fcmToken || null;
  }

  /**
   * Update user's push notification preferences
   * @param {string} userId - User ID
   * @param {boolean} enabled - Whether push notifications are enabled
   */
  async updatePushNotificationPreferences(userId, enabled) {
    const update = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'set pushNotificationsEnabled = :enabled, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':enabled': enabled,
        ':updatedAt': Date.now()
      }
    };

    await client.send(new UpdateCommand(update));
    console.log(`Updated push notification preferences for user ${userId}: ${enabled}`);
  }

  /**
   * Remove user's FCM token
   * @param {string} userId - User ID
   */
  async removeFCMToken(userId) {
    await client.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    console.log(`Removed FCM token for user ${userId}`);
  }

  /**
   * Check if user has push notifications enabled
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasPushNotificationsEnabled(userId) {
    const user = await this.getUser(userId);
    return user?.pushNotificationsEnabled !== false; // Default to true if not set
  }

  /**
   * Get multiple users by their IDs
   * @param {string[]} userIds - Array of user IDs
   * @returns {Promise<object[]>}
   */
  async getUsers(userIds) {
    const users = [];
    
    // DynamoDB BatchGet has a limit of 100 items per request
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const result = await client.send(new GetCommand({
        RequestItems: {
          [USERS_TABLE]: {
            Keys: batch.map(userId => ({ userId }))
          }
        }
      }));

      if (result.Responses && result.Responses[USERS_TABLE]) {
        users.push(...result.Responses[USERS_TABLE]);
      }
    }

    return users;
  }

  /**
   * Update user's last activity
   * @param {string} userId - User ID
   */
  async updateLastActivity(userId) {
    const update = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'set lastActivity = :lastActivity',
      ExpressionAttributeValues: {
        ':lastActivity': Date.now()
      }
    };

    await client.send(new UpdateCommand(update));
  }
}

module.exports = UserManager; 