const CrucibleOrchestrator = require('./orchestrator');
const { SynthesisEngine, SynthesisConfigManager, BaseSynthesisProvider, OpenAISynthesisProvider } = require('./synthesis');
const ProviderRegistry = require('./providers');
const BaseProvider = require('./providers/base');
const OpenAIProvider = require('./providers/openai');
const DeepSeekProvider = require('./providers/deepseek');

/**
 * Main Crucible Core library
 * Provides multi-provider AI querying and response orchestration
 */
class CrucibleCore {
  constructor(config = {}) {
    // Initialize orchestrator for multi-provider querying
    this.orchestrator = new CrucibleOrchestrator();
    
    // Register providers if provided
    if (config.providers) {
      this.registerProviders(config.providers);
    }
    
    // Initialize synthesis engine (optional)
    this.synthesis = null;
    if (config.synthesis !== false) {
      this.synthesis = new SynthesisEngine(config.synthesis);
    }
  }

  /**
   * Register multiple providers at once
   * @param {Object} providers - Map of provider names to configurations
   */
  registerProviders(providers) {
    Object.entries(providers).forEach(([name, config]) => {
      this.orchestrator.registerProvider(name, config);
    });
  }

  /**
   * Register a single provider
   * @param {string} name - Provider name
   * @param {BaseProvider|Object} provider - Provider instance or configuration
   */
  registerProvider(name, provider) {
    this.orchestrator.registerProvider(name, provider);
  }

  /**
   * Query multiple providers in parallel (NO synthesis)
   * @param {string} prompt - The input prompt
   * @param {Array<string>} providerNames - Array of provider names to query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query results with responses and metadata
   */
  async query(prompt, providerNames, options = {}) {
    return this.orchestrator.queryProviders(prompt, providerNames, options);
  }

  /**
   * Query multiple providers and synthesize the results (REQUIRES synthesis engine)
   * @param {string} prompt - The input prompt
   * @param {Array<string>} providerNames - Array of provider names to query
   * @param {Object} queryOptions - Query options
   * @param {Object} synthesisOptions - Synthesis options
   * @returns {Promise<Object>} Synthesized result
   */
  async queryAndSynthesize(prompt, providerNames, queryOptions = {}, synthesisOptions = {}) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it in constructor config or use query() method.');
    }

    const result = await this.orchestrator.queryProviders(prompt, providerNames, queryOptions);
    
    if (result.responses.length === 0) {
      throw new Error('No successful responses to synthesize');
    }

    const synthesis = await this.synthesis.synthesize(result.responses, synthesisOptions);
    
    return {
      ...synthesis,
      queryResult: result
    };
  }

  /**
   * Query a single provider
   * @param {string} prompt - The input prompt
   * @param {string} providerName - Provider name
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Provider response
   */
  async querySingle(prompt, providerName, options = {}) {
    return this.orchestrator.queryProvider(prompt, providerName, options);
  }

  /**
   * Synthesize existing responses (REQUIRES synthesis engine)
   * @param {Array} responses - Array of provider responses
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} Synthesized response
   */
  async synthesize(responses, options = {}) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it in constructor config.');
    }
    return this.synthesis.synthesize(responses, options);
  }

  /**
   * Enable synthesis engine after initialization
   * @param {Object} config - Synthesis engine configuration
   */
  enableSynthesis(config = {}) {
    this.synthesis = new SynthesisEngine(config);
  }

  /**
   * Disable synthesis engine
   */
  disableSynthesis() {
    this.synthesis = null;
  }

  /**
   * Check if synthesis engine is enabled
   * @returns {boolean} True if synthesis engine is available
   */
  isSynthesisEnabled() {
    return this.synthesis !== null;
  }

  /**
   * Get synthesis engine instance (if enabled)
   * @returns {SynthesisEngine|null} Synthesis engine instance or null
   */
  getSynthesisEngine() {
    return this.synthesis;
  }

  /**
   * Register a synthesis provider
   * @param {string} name - Provider name
   * @param {BaseSynthesisProvider|Object} provider - Provider instance or configuration
   */
  registerSynthesisProvider(name, provider) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    this.synthesis.registerProvider(name, provider);
  }

  /**
   * Get synthesis provider metadata
   * @param {string} name - Provider name
   * @returns {Object} Provider metadata
   */
  getSynthesisProviderMetadata(name) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    return this.synthesis.getProviderMetadata(name);
  }

  /**
   * Get metadata for all synthesis providers
   * @returns {Object} Map of provider metadata
   */
  getAllSynthesisProviderMetadata() {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    return this.synthesis.getAllProviderMetadata();
  }

  /**
   * Set default synthesis provider
   * @param {string} name - Provider name
   */
  setDefaultSynthesisProvider(name) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    this.synthesis.setDefaultProvider(name);
  }

  /**
   * Get available synthesis strategies
   * @returns {Array} List of available strategies
   */
  getAvailableSynthesisStrategies() {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    return provider.getAvailableStrategies ? provider.getAvailableStrategies() : [];
  }

  /**
   * Reload synthesis configuration
   */
  reloadSynthesisConfig() {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    if (provider.reloadConfig) {
      provider.reloadConfig();
    }
  }

  /**
   * Add a new synthesis strategy programmatically
   * @param {string} strategyName - Name of the strategy
   * @param {string} userPrompt - User prompt template
   * @param {string} systemPrompt - System prompt template
   */
  addSynthesisStrategy(strategyName, userPrompt, systemPrompt) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.addStrategy) {
      provider.configManager.addStrategy(strategyName, userPrompt, systemPrompt);
    } else {
      throw new Error('Current synthesis provider does not support strategy management');
    }
  }

  /**
   * Update an existing synthesis strategy
   * @param {string} strategyName - Name of the strategy
   * @param {string} userPrompt - New user prompt template
   * @param {string} systemPrompt - New system prompt template
   */
  updateSynthesisStrategy(strategyName, userPrompt, systemPrompt) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.updateStrategy) {
      provider.configManager.updateStrategy(strategyName, userPrompt, systemPrompt);
    } else {
      throw new Error('Current synthesis provider does not support strategy management');
    }
  }

  /**
   * Remove a synthesis strategy
   * @param {string} strategyName - Name of the strategy to remove
   */
  removeSynthesisStrategy(strategyName) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.removeStrategy) {
      provider.configManager.removeStrategy(strategyName);
    } else {
      throw new Error('Current synthesis provider does not support strategy management');
    }
  }

  /**
   * Check if a synthesis strategy exists
   * @param {string} strategyName - Name of the strategy
   * @returns {boolean} True if strategy exists
   */
  hasSynthesisStrategy(strategyName) {
    if (!this.synthesis) {
      return false;
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.hasStrategy) {
      return provider.configManager.hasStrategy(strategyName);
    }
    return false;
  }

  /**
   * Get synthesis strategy prompts
   * @param {string} strategyName - Name of the strategy
   * @returns {Object|null} Object with user and system prompts, or null if not found
   */
  getSynthesisStrategy(strategyName) {
    if (!this.synthesis) {
      return null;
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.getStrategy) {
      return provider.configManager.getStrategy(strategyName);
    }
    return null;
  }

  /**
   * Save synthesis configuration to file
   * @param {string} filePath - Optional file path
   */
  saveSynthesisConfig(filePath = null) {
    if (!this.synthesis) {
      throw new Error('Synthesis engine is disabled. Enable it first.');
    }
    const provider = this.synthesis.getProvider();
    if (provider.configManager && provider.configManager.saveConfig) {
      provider.configManager.saveConfig(filePath);
    } else {
      throw new Error('Current synthesis provider does not support config saving');
    }
  }

  /**
   * Get all registered providers
   * @returns {Array} List of provider names
   */
  getProviders() {
    return this.orchestrator.getProviders();
  }

  /**
   * Get provider metadata
   * @param {string} name - Provider name
   * @returns {Object} Provider metadata
   */
  getProviderMetadata(name) {
    return this.orchestrator.getProviderMetadata(name);
  }

  /**
   * Get metadata for all providers
   * @returns {Object} Map of provider metadata
   */
  getAllProviderMetadata() {
    return this.orchestrator.getAllProviderMetadata();
  }

  /**
   * Remove a provider
   * @param {string} name - Provider name
   */
  removeProvider(name) {
    this.orchestrator.removeProvider(name);
  }

  /**
   * Clear all providers
   */
  clearProviders() {
    this.orchestrator.clearProviders();
  }
}

// Export the main class and individual components
module.exports = {
  CrucibleCore,
  CrucibleOrchestrator,
  SynthesisEngine,
  SynthesisConfigManager,
  BaseSynthesisProvider,
  OpenAISynthesisProvider,
  ProviderRegistry,
  BaseProvider,
  OpenAIProvider,
  DeepSeekProvider
};

// Export default instance for convenience
module.exports.default = CrucibleCore; 