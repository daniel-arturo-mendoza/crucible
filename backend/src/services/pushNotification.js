const admin = require('firebase-admin');

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.isInitialized = true;
        console.log('Firebase already initialized');
        return;
      }

      // Initialize Firebase Admin SDK
      // In production, use service account key from environment
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // For local development, you can use a service account file
        // or initialize without credentials (not recommended for production)
        console.log('Firebase service account key not found. Push notifications will be disabled.');
        return;
      }

      this.isInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Send push notification to a specific user
   * @param {string} fcmToken - User's FCM token
   * @param {object} notification - Notification data
   * @param {object} data - Additional data payload
   */
  async sendNotification(fcmToken, notification, data = {}) {
    if (!this.isInitialized) {
      console.log('Firebase not initialized, skipping push notification');
      return null;
    }

    try {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'Crucible AI',
          body: notification.body || 'Your response is ready!',
          ...notification
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'crucible-ai'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`Push notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // Handle specific FCM errors
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        console.log('Invalid or expired FCM token');
        // TODO: Remove invalid token from user's record
      }
      
      throw error;
    }
  }

  /**
   * Send push notification for job completion
   * @param {string} fcmToken - User's FCM token
   * @param {object} job - Job data
   * @param {string} response - AI response
   */
  async sendJobCompletionNotification(fcmToken, job, response) {
    const notification = {
      title: '🤖 Crucible AI Response',
      body: `Your question about "${job.prompt.substring(0, 50)}..." is ready!`,
    };

    const data = {
      type: 'job_completion',
      jobId: job.jobId,
      prompt: job.prompt,
      response: response.substring(0, 100) + '...', // Truncate for notification
      channel: job.channel
    };

    return this.sendNotification(fcmToken, notification, data);
  }

  /**
   * Send push notification for job error
   * @param {string} fcmToken - User's FCM token
   * @param {object} job - Job data
   * @param {string} errorMessage - Error message
   */
  async sendJobErrorNotification(fcmToken, job, errorMessage) {
    const notification = {
      title: '❌ Crucible AI Error',
      body: 'Sorry, there was an error processing your question.',
    };

    const data = {
      type: 'job_error',
      jobId: job.jobId,
      prompt: job.prompt,
      error: errorMessage,
      channel: job.channel
    };

    return this.sendNotification(fcmToken, notification, data);
  }

  /**
   * Send push notification to multiple tokens
   * @param {string[]} fcmTokens - Array of FCM tokens
   * @param {object} notification - Notification data
   * @param {object} data - Additional data payload
   */
  async sendMulticastNotification(fcmTokens, notification, data = {}) {
    if (!this.isInitialized) {
      console.log('Firebase not initialized, skipping multicast notification');
      return null;
    }

    try {
      const message = {
        notification: {
          title: notification.title || 'Crucible AI',
          body: notification.body || 'Your response is ready!',
          ...notification
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'crucible-ai'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens: fcmTokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Multicast notification sent: ${response.successCount}/${fcmTokens.length} successful`);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((resp, idx) => resp.success ? null : fcmTokens[idx])
          .filter(token => token !== null);
        
        console.log(`Failed tokens: ${failedTokens.length}`);
        // TODO: Remove failed tokens from user records
      }
      
      return response;
    } catch (error) {
      console.error('Error sending multicast notification:', error);
      throw error;
    }
  }

  /**
   * Check if push notifications are available
   */
  isAvailable() {
    return this.isInitialized;
  }
}

module.exports = PushNotificationService; 