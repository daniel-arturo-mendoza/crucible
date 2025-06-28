const axios = require('axios');
const BaseProvider = require('./base');

/**
 * DeepSeek provider implementation
 */
class DeepSeekProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'DeepSeek',
      ...config
    });
    
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
    this.apiUrl = config.apiUrl || process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
    this.temperature = config.temperature || 0.7;
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant providing accurate and unbiased information.';
  }

  /**
   * Validate DeepSeek configuration
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    if (!this.apiUrl) {
      throw new Error('DeepSeek API URL is required');
    }
    return true;
  }

  /**
   * Query DeepSeek with a prompt
   * @param {string} prompt - The input prompt
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Standardized response
   */
  async query(prompt, options = {}) {
    try {
      this.validateConfig();

      const {
        model = this.model,
        temperature = this.temperature,
        systemPrompt = this.systemPrompt,
        maxTokens,
        messages = []
      } = options;

      // Build messages array
      const messageArray = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages,
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model,
          messages: messageArray,
          temperature,
          ...(maxTokens && { max_tokens: maxTokens })
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return this.createResponse(
        response.data.choices[0].message.content,
        {
          model: response.data.model,
          usage: response.data.usage,
          finishReason: response.data.choices[0].finish_reason
        }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get available models
   * @returns {Promise<Array>} List of available models
   */
  async getModels() {
    try {
      this.validateConfig();
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data.data.map(model => model.id);
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

module.exports = DeepSeekProvider; 