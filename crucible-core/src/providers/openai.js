const OpenAI = require('openai');
const BaseProvider = require('./base');

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      name: 'OpenAI',
      ...config
    });
    
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature || 0.7;
    this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant providing accurate and unbiased information.';
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Validate OpenAI configuration
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return true;
  }

  /**
   * Query OpenAI with a prompt
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

      const response = await this.client.chat.completions.create({
        model,
        messages: messageArray,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens })
      });

      return this.createResponse(
        response.choices[0].message.content,
        {
          model: response.model,
          usage: response.usage,
          finishReason: response.choices[0].finish_reason
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
      const models = await this.client.models.list();
      return models.data.map(model => model.id);
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

module.exports = OpenAIProvider; 