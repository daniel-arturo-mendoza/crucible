const ProviderRegistry = require('./providers');

/**
 * Core orchestrator for multi-provider AI querying
 */
class CrucibleOrchestrator {
  constructor() {
    this.registry = new ProviderRegistry();
  }

  /**
   * Register a provider
   * @param {string} name - Provider name
   * @param {BaseProvider|Object} provider - Provider instance or configuration
   */
  registerProvider(name, provider) {
    if (provider && typeof provider.query === 'function') {
      // Provider instance
      this.registry.register(name, provider);
    } else {
      // Configuration object
      this.registry.registerByName(name, provider);
    }
  }

  /**
   * Query multiple providers in parallel
   * @param {string} prompt - The input prompt
   * @param {Array<string>} providerNames - Array of provider names to query
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of provider responses
   */
  async queryProviders(prompt, providerNames, options = {}) {
    if (!Array.isArray(providerNames) || providerNames.length === 0) {
      throw new Error('Provider names must be a non-empty array');
    }

    // Validate all providers exist
    const missingProviders = providerNames.filter(name => !this.registry.has(name));
    if (missingProviders.length > 0) {
      throw new Error(`Providers not found: ${missingProviders.join(', ')}`);
    }

    // Query all providers in parallel
    const queryPromises = providerNames.map(async (name) => {
      try {
        const provider = this.registry.get(name);
        const response = await provider.query(prompt, options);
        return {
          success: true,
          provider: name,
          response
        };
      } catch (error) {
        return {
          success: false,
          provider: name,
          error: error.message
        };
      }
    });

    const results = await Promise.all(queryPromises);
    
    // Separate successful and failed queries
    const successful = results.filter(r => r.success).map(r => r.response);
    const failed = results.filter(r => !r.success);

    return {
      responses: successful,
      failed: failed,
      total: results.length,
      successful: successful.length,
      failed: failed.length
    };
  }

  /**
   * Query a single provider
   * @param {string} prompt - The input prompt
   * @param {string} providerName - Provider name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Provider response
   */
  async queryProvider(prompt, providerName, options = {}) {
    const result = await this.queryProviders(prompt, [providerName], options);
    
    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }
    
    return result.responses[0];
  }

  /**
   * Get all registered providers
   * @returns {Array} List of provider names
   */
  getProviders() {
    return this.registry.getAll();
  }

  /**
   * Check if a provider is registered
   * @param {string} name - Provider name
   * @returns {boolean} True if provider is registered
   */
  hasProvider(name) {
    return this.registry.has(name);
  }

  /**
   * Get provider metadata
   * @param {string} name - Provider name
   * @returns {Object} Provider metadata
   */
  getProviderMetadata(name) {
    return this.registry.getMetadata(name);
  }

  /**
   * Get metadata for all providers
   * @returns {Object} Map of provider metadata
   */
  getAllProviderMetadata() {
    return this.registry.getAllMetadata();
  }

  /**
   * Remove a provider
   * @param {string} name - Provider name
   */
  removeProvider(name) {
    this.registry.remove(name);
  }

  /**
   * Clear all providers
   */
  clearProviders() {
    this.registry.clear();
  }
}

module.exports = CrucibleOrchestrator; 