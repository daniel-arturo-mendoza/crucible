/**
 * Base provider interface for AI model providers
 * All providers must implement this interface
 */
class BaseProvider {
  constructor(config = {}) {
    this.name = config.name || 'Unknown';
    this.config = config;
  }

  /**
   * Query the AI provider with a prompt
   * @param {string} prompt - The input prompt
   * @param {Object} options - Additional options for the query
   * @returns {Promise<Object>} Standardized response object
   */
  async query(prompt, options = {}) {
    throw new Error('query method must be implemented by provider');
  }

  /**
   * Validate the provider configuration
   * @returns {boolean} True if configuration is valid
   */
  validateConfig() {
    throw new Error('validateConfig method must be implemented by provider');
  }

  /**
   * Get provider metadata
   * @returns {Object} Provider metadata
   */
  getMetadata() {
    return {
      name: this.name,
      type: this.constructor.name,
      config: this.config
    };
  }

  /**
   * Create a standardized response object
   * @param {string} response - The AI response content
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Standardized response
   */
  createResponse(response, metadata = {}) {
    return {
      source: this.name,
      response: response,
      model: metadata.model || 'unknown',
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        provider: this.name
      }
    };
  }

  /**
   * Handle provider-specific errors
   * @param {Error} error - The original error
   * @returns {Error} Standardized error
   */
  handleError(error) {
    return new Error(`${this.name} Provider Error: ${error.message}`);
  }
}

module.exports = BaseProvider; 