const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (!this.accountSid || !this.authToken || !this.whatsappNumber) {
      console.warn('Twilio credentials not fully configured. WhatsApp features will be disabled.');
      this.client = null;
    } else {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (with country code, e.g., '+1234567890')
   * @param {string} body - Message content
   * @returns {Promise<Object>} Twilio message object
   */
  async sendWhatsAppMessage(to, body) {
    if (!this.client) {
      throw new Error('Twilio client not initialized. Please check your environment variables.');
    }

    try {
      // Ensure the 'to' number has the whatsapp: prefix
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: formattedTo,
        body: body
      });

      console.log(`WhatsApp message sent successfully. SID: ${message.sid}`);
      return message;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send a WhatsApp message with Crucible AI response
   * @param {string} to - Recipient phone number
   * @param {string} userMessage - Original user message
   * @param {Object} crucibleResponse - Response from Crucible
   * @returns {Promise<Object>} Twilio message object
   */
  async sendCrucibleResponse(to, userMessage, crucibleResponse) {
    let responseText = '';
    
    if (crucibleResponse.synthesized) {
      responseText = `🤖 *Crucible AI Response*\n\n${crucibleResponse.synthesized}`;
    } else if (crucibleResponse.responses) {
      responseText = `🤖 *Crucible AI Responses*\n\n`;
      Object.entries(crucibleResponse.responses).forEach(([provider, response]) => {
        responseText += `*${provider.toUpperCase()}*:\n${response.content}\n\n`;
      });
    } else {
      responseText = `🤖 *Crucible AI Response*\n\n${crucibleResponse.content || JSON.stringify(crucibleResponse)}`;
    }

    return this.sendWhatsAppMessage(to, responseText);
  }

  /**
   * Validate if a phone number is properly formatted
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid format
   */
  isValidPhoneNumber(phoneNumber) {
    // Basic validation - should start with + and contain only digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Check if Twilio is properly configured
   * @returns {boolean} True if configured
   */
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.whatsappNumber);
  }
}

module.exports = TwilioService; 