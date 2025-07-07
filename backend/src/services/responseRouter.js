const TwilioService = require('./twilio');
const PushNotificationService = require('./pushNotification');
const UserManager = require('./userManager');

class ResponseRouter {
  constructor() {
    this.twilioService = new TwilioService();
    this.pushNotificationService = new PushNotificationService();
    this.userManager = new UserManager();
  }

  /**
   * Route response to appropriate channel
   * @param {object} job - The completed job
   * @param {string} response - AI response
   * @param {object} metadata - Additional metadata
   */
  async routeResponse(job, response, metadata = {}) {
    console.log(`Routing response for job ${job.jobId} to ${job.channel} channel`);

    try {
      switch (job.channel) {
        case 'whatsapp':
          await this.sendWhatsAppResponse(job, response, metadata);
          break;
        case 'mobile':
          await this.sendMobileResponse(job, response, metadata);
          break;
        default:
          throw new Error(`Unsupported channel: ${job.channel}`);
      }

      console.log(`Successfully routed response for job ${job.jobId}`);
    } catch (error) {
      console.error(`Error routing response for job ${job.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Send response via WhatsApp
   * @param {object} job - Job data
   * @param {string} response - AI response
   * @param {object} metadata - Additional metadata
   */
  async sendWhatsAppResponse(job, response, metadata) {
    if (!this.twilioService.isConfigured()) {
      throw new Error('Twilio is not properly configured');
    }

    const phoneNumber = job.channelData.phoneNumber;
    if (!phoneNumber) {
      throw new Error('Phone number not found in channel data');
    }

    // Send response via Twilio
    await this.twilioService.sendCrucibleResponse(
      phoneNumber,
      job.prompt,
      response
    );

    console.log(`Sent WhatsApp response for job ${job.jobId} to ${phoneNumber}`);
  }

  /**
   * Send response to mobile app
   * @param {object} job - Job data
   * @param {string} response - AI response
   * @param {object} metadata - Additional metadata
   */
  async sendMobileResponse(job, response, metadata) {
    console.log(`Mobile response ready for job ${job.jobId}`);
    
    // Get user's FCM token
    const fcmToken = await this.userManager.getFCMToken(job.userId);
    
    if (fcmToken) {
      // Check if user has push notifications enabled
      const pushEnabled = await this.userManager.hasPushNotificationsEnabled(job.userId);
      
      if (pushEnabled) {
        try {
          // Send push notification
          await this.pushNotificationService.sendJobCompletionNotification(fcmToken, job, response);
          console.log(`Push notification sent for job ${job.jobId} to user ${job.userId}`);
        } catch (error) {
          console.error(`Error sending push notification for job ${job.jobId}:`, error);
          
          // If FCM token is invalid, remove it
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            await this.userManager.removeFCMToken(job.userId);
            console.log(`Removed invalid FCM token for user ${job.userId}`);
          }
        }
      } else {
        console.log(`Push notifications disabled for user ${job.userId}`);
      }
    } else {
      console.log(`No FCM token found for user ${job.userId}`);
    }
    
    // Response is also stored in job result for app polling (fallback)
    console.log(`Mobile app can also poll /mobile/job/${job.jobId} for updates`);
  }



  /**
   * Send error response to appropriate channel
   * @param {object} job - Job data
   * @param {string} errorMessage - Error message
   */
  async routeErrorResponse(job, errorMessage) {
    console.log(`Routing error response for job ${job.jobId} to ${job.channel} channel`);

    try {
      switch (job.channel) {
        case 'whatsapp':
          await this.sendWhatsAppError(job, errorMessage);
          break;
        case 'mobile':
          await this.sendMobileError(job, errorMessage);
          break;
        default:
          throw new Error(`Unsupported channel: ${job.channel}`);
      }

      console.log(`Successfully routed error response for job ${job.jobId}`);
    } catch (error) {
      console.error(`Error routing error response for job ${job.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Send error via WhatsApp
   * @param {object} job - Job data
   * @param {string} errorMessage - Error message
   */
  async sendWhatsAppError(job, errorMessage) {
    if (!this.twilioService.isConfigured()) {
      return; // Skip if Twilio not configured
    }

    const phoneNumber = job.channelData.phoneNumber;
    if (!phoneNumber) {
      return; // Skip if no phone number
    }

    let userFriendlyMessage = 'Sorry, I encountered an error processing your request. Please try again.';
    
    if (errorMessage === 'AI processing timeout') {
      userFriendlyMessage = 'Sorry, your request took too long to process. Please try a simpler question or try again later.';
    }

    await this.twilioService.sendWhatsAppMessage(phoneNumber, userFriendlyMessage);
    console.log(`Sent WhatsApp error message for job ${job.jobId} to ${phoneNumber}`);
  }

  /**
   * Send error to mobile app
   * @param {object} job - Job data
   * @param {string} errorMessage - Error message
   */
  async sendMobileError(job, errorMessage) {
    console.log(`Mobile error response ready for job ${job.jobId}`);
    
    // Get user's FCM token
    const fcmToken = await this.userManager.getFCMToken(job.userId);
    
    if (fcmToken) {
      // Check if user has push notifications enabled
      const pushEnabled = await this.userManager.hasPushNotificationsEnabled(job.userId);
      
      if (pushEnabled) {
        try {
          // Send error push notification
          await this.pushNotificationService.sendJobErrorNotification(fcmToken, job, errorMessage);
          console.log(`Error push notification sent for job ${job.jobId} to user ${job.userId}`);
        } catch (error) {
          console.error(`Error sending error push notification for job ${job.jobId}:`, error);
          
          // If FCM token is invalid, remove it
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            await this.userManager.removeFCMToken(job.userId);
            console.log(`Removed invalid FCM token for user ${job.userId}`);
          }
        }
      }
    }
    
    // Error is also stored in job result for app polling (fallback)
    console.log(`Mobile app can also poll /mobile/job/${job.jobId} for error details`);
  }
}

module.exports = ResponseRouter; 