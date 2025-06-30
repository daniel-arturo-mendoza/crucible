const OpenAIProvider = require('./openai');
const DeepSeekProvider = require('./deepseek');

/**
 * Provider registry for managing AI model providers
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.defaultProviders = {
      'openai': OpenAIProvider,
      'deepseek': DeepSeekProvider
    };
  }

  /**
   * Register a provider instance
   * @param {string} name - Provider name
   * @param {BaseProvider} provider - Provider instance
   */
  register(name, provider) {
    if (!provider || typeof provider.query !== 'function') {
      throw new Error('Provider must implement the BaseProvider interface');
    }
    this.providers.set(name, provider);
  }

  /**
   * Register a provider by name with configuration
   * @param {string} name - Provider name
   * @param {Object} config - Provider configuration
   */
  registerByName(name, config = {}) {
    const ProviderClass = this.defaultProviders[name];
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${name}`);
    }
    const provider = new ProviderClass(config);
    this.register(name, provider);
  }

  /**
   * Get a provider by name
   * @param {string} name - Provider name
   * @returns {BaseProvider} Provider instance
   */
  get(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }

  /**
   * Get all registered providers
   * @returns {Array} List of provider names
   */
  getAll() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   * @param {string} name - Provider name
   * @returns {boolean} True if provider is registered
   */
  has(name) {
    return this.providers.has(name);
  }

  /**
   * Remove a provider
   * @param {string} name - Provider name
   */
  remove(name) {
    this.providers.delete(name);
  }

  /**
   * Clear all providers
   */
  clear() {
    this.providers.clear();
  }

  /**
   * Get provider metadata
   * @param {string} name - Provider name
   * @returns {Object} Provider metadata
   */
  getMetadata(name) {
    const provider = this.get(name);
    return provider.getMetadata();
  }

  /**
   * Get metadata for all providers
   * @returns {Object} Map of provider metadata
   */
  getAllMetadata() {
    const metadata = {};
    for (const [name, provider] of this.providers) {
      metadata[name] = provider.getMetadata();
    }
    return metadata;
  }
}

module.exports = ProviderRegistry; 