const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

/**
 * Configuration manager for synthesis prompts
 */
class SynthesisConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || this.findDefaultConfigPath();
    this.config = this.loadConfig();
  }

  /**
   * Find default config path in the application directory
   * @returns {string} Default config path
   */
  findDefaultConfigPath() {
    // Get the current working directory (where the application is running)
    const cwd = process.cwd();
    
    // Look for config in the application directory (not library directory)
    const possiblePaths = [
      path.join(cwd, 'crucible-synthesis-config.json'),
      path.join(cwd, 'config', 'synthesis-config.json'),
      path.join(cwd, 'synthesis-config.json'),
      path.join(cwd, '.crucible', 'synthesis-config.json'),
      process.env.CRUCIBLE_SYNTHESIS_CONFIG
    ].filter(Boolean);

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        console.log(`Found synthesis config at: ${configPath}`);
        return configPath;
      }
    }
    
    console.log('No synthesis config file found, using default hardcoded prompts');
    return null;
  }

  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    if (!this.configPath) {
      return {};
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configContent);
      console.log(`Loaded synthesis config from: ${this.configPath}`);
      return config;
    } catch (error) {
      console.warn(`Warning: Could not load synthesis config from ${this.configPath}:`, error.message);
      return {};
    }
  }

  /**
   * Get prompt for a specific strategy
   * @param {string} strategy - Strategy name
   * @param {string} promptType - Type of prompt ('user' or 'system')
   * @param {Object} variables - Variables to substitute in the prompt
   * @returns {string} Prompt text
   */
  getPrompt(strategy, promptType, variables = {}) {
    const configKey = `${strategy}_${promptType}_prompt`;
    
    // Try to get from config file first
    let prompt = this.getFromConfig(configKey);
    
    // Fall back to hardcoded defaults if not found
    if (!prompt) {
      prompt = this.getDefaultPrompt(strategy, promptType);
    }

    // Substitute variables in the prompt
    return this.substituteVariables(prompt, variables);
  }

  /**
   * Get prompt from configuration
   * @param {string} key - Configuration key
   * @returns {string|null} Prompt text or null if not found
   */
  getFromConfig(key) {
    return this.config[key] || null;
  }

  /**
   * Substitute variables in prompt template
   * @param {string} prompt - Prompt template
   * @param {Object} variables - Variables to substitute
   * @returns {string} Prompt with variables substituted
   */
  substituteVariables(prompt, variables) {
    let result = prompt;
    
    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  /**
   * Get default hardcoded prompts
   * @param {string} strategy - Strategy name
   * @param {string} promptType - Type of prompt ('user' or 'system')
   * @returns {string} Default prompt text
   */
  getDefaultPrompt(strategy, promptType) {
    if (promptType === 'system') {
      return this.getDefaultSystemPrompt(strategy);
    } else {
      return this.getDefaultUserPrompt(strategy);
    }
  }

  /**
   * Get default system prompts
   * @param {string} strategy - Strategy name
   * @returns {string} Default system prompt
   */
  getDefaultSystemPrompt(strategy) {
    switch (strategy) {
      case 'combine':
        return 'You are an expert at synthesizing information from multiple sources into a coherent, balanced response.';
      case 'compare':
        return 'You are an expert at comparing and analyzing responses from different AI models, identifying patterns and differences.';
      case 'fact-check':
        return 'You are an expert fact-checker who can identify contradictions and verify information across multiple sources.';
      default:
        return 'You are an expert at processing and synthesizing information from multiple sources.';
    }
  }

  /**
   * Get default user prompts
   * @param {string} strategy - Strategy name
   * @returns {string} Default user prompt template
   */
  getDefaultUserPrompt(strategy) {
    switch (strategy) {
      case 'combine':
        return `Below are responses from {{responseCount}} different AI models about the same topic. 
Please synthesize these responses into a single, comprehensive answer that:
1. Combines the unique insights from each source
2. Resolves any contradictions
3. Maintains a neutral, balanced perspective
4. Preserves important details from all sources

{{responseTexts}}

Please provide a synthesized response that combines these perspectives.`;

      case 'compare':
        return `Below are responses from {{responseCount}} different AI models about the same topic.
Please provide a detailed comparison that:
1. Identifies key differences between the responses
2. Highlights areas of agreement
3. Evaluates the strengths and weaknesses of each approach
4. Provides insights into why the responses might differ

{{responseTexts}}

Please provide a comprehensive comparison of these responses.`;

      case 'fact-check':
        return `Below are responses from {{responseCount}} different AI models about the same topic.
Please fact-check these responses by:
1. Identifying factual claims in each response
2. Highlighting any contradictions between sources
3. Flagging potentially incorrect information
4. Providing a fact-checked summary

{{responseTexts}}

Please provide a fact-checked synthesis of these responses.`;

      default:
        return `Below are responses from {{responseCount}} different AI models about the same topic.
Please synthesize these responses into a single, comprehensive answer.

{{responseTexts}}

Please provide a synthesized response.`;
    }
  }

  /**
   * Reload configuration from file
   */
  reloadConfig() {
    this.config = this.loadConfig();
  }

  /**
   * Get all available strategies from config
   * @returns {Array} List of strategy names
   */
  getAvailableStrategies() {
    const strategies = new Set();
    
    // Extract strategies from config keys
    for (const key of Object.keys(this.config)) {
      const match = key.match(/^(.+)_(user|system)_prompt$/);
      if (match) {
        strategies.add(match[1]);
      }
    }
    
    // Add default strategies
    strategies.add('combine');
    strategies.add('compare');
    strategies.add('fact-check');
    
    return Array.from(strategies);
  }

  /**
   * Add a new strategy programmatically
   * @param {string} strategyName - Name of the strategy
   * @param {string} userPrompt - User prompt template
   * @param {string} systemPrompt - System prompt template
   */
  addStrategy(strategyName, userPrompt, systemPrompt) {
    if (!strategyName || typeof strategyName !== 'string') {
      throw new Error('Strategy name must be a non-empty string');
    }
    
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new Error('User prompt must be a non-empty string');
    }
    
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      throw new Error('System prompt must be a non-empty string');
    }

    // Add strategy to config
    this.config[`${strategyName}_user_prompt`] = userPrompt;
    this.config[`${strategyName}_system_prompt`] = systemPrompt;
    
    console.log(`Added strategy: ${strategyName}`);
  }

  /**
   * Update an existing strategy
   * @param {string} strategyName - Name of the strategy
   * @param {string} userPrompt - New user prompt template
   * @param {string} systemPrompt - New system prompt template
   */
  updateStrategy(strategyName, userPrompt, systemPrompt) {
    if (!this.hasStrategy(strategyName)) {
      throw new Error(`Strategy '${strategyName}' does not exist`);
    }
    
    this.addStrategy(strategyName, userPrompt, systemPrompt);
    console.log(`Updated strategy: ${strategyName}`);
  }

  /**
   * Remove a strategy
   * @param {string} strategyName - Name of the strategy to remove
   */
  removeStrategy(strategyName) {
    if (!this.hasStrategy(strategyName)) {
      throw new Error(`Strategy '${strategyName}' does not exist`);
    }
    
    // Don't allow removal of default strategies
    const defaultStrategies = ['combine', 'compare', 'fact-check'];
    if (defaultStrategies.includes(strategyName)) {
      throw new Error(`Cannot remove default strategy: ${strategyName}`);
    }
    
    delete this.config[`${strategyName}_user_prompt`];
    delete this.config[`${strategyName}_system_prompt`];
    
    console.log(`Removed strategy: ${strategyName}`);
  }

  /**
   * Check if a strategy exists
   * @param {string} strategyName - Name of the strategy
   * @returns {boolean} True if strategy exists
   */
  hasStrategy(strategyName) {
    return this.config.hasOwnProperty(`${strategyName}_user_prompt`) ||
           this.config.hasOwnProperty(`${strategyName}_system_prompt`);
  }

  /**
   * Get strategy prompts
   * @param {string} strategyName - Name of the strategy
   * @returns {Object} Object with user and system prompts
   */
  getStrategy(strategyName) {
    if (!this.hasStrategy(strategyName)) {
      return null;
    }
    
    return {
      user: this.config[`${strategyName}_user_prompt`],
      system: this.config[`${strategyName}_system_prompt`]
    };
  }

  /**
   * Save current config to file
   * @param {string} filePath - Optional file path, uses current configPath if not provided
   */
  saveConfig(filePath = null) {
    const targetPath = filePath || this.configPath;
    
    if (!targetPath) {
      throw new Error('No config file path specified and no default path available');
    }
    
    try {
      fs.writeFileSync(targetPath, JSON.stringify(this.config, null, 2));
      console.log(`Config saved to: ${targetPath}`);
    } catch (error) {
      throw new Error(`Failed to save config to ${targetPath}: ${error.message}`);
    }
  }
}

/**
 * Base synthesis provider interface
 */
class BaseSynthesisProvider {
  constructor(config = {}) {
    this.name = config.name || 'Unknown';
    this.config = config;
    this.configManager = new SynthesisConfigManager(config.configPath);
  }

  /**
   * Synthesize responses using this provider
   * @param {Array} responses - Array of provider responses
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} Synthesis result
   */
  async synthesize(responses, options = {}) {
    throw new Error('synthesize method must be implemented by provider');
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
}

/**
 * OpenAI synthesis provider
 */
class OpenAISynthesisProvider extends BaseSynthesisProvider {
  constructor(config = {}) {
    super({ name: 'OpenAI', ...config });
    
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.defaultModel = config.model || 'gpt-4';
    this.defaultTemperature = config.temperature || 0.3;
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  validateConfig() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return true;
  }

  async synthesize(responses, options = {}) {
    try {
      this.validateConfig();

      const {
        model = this.defaultModel,
        temperature = this.defaultTemperature,
        strategy = 'combine',
        customPrompt,
        systemPrompt
      } = options;

      // Prepare variables for prompt substitution
      const variables = {
        responseCount: responses.length.toString(),
        responseTexts: this.formatResponseTexts(responses)
      };

      // Get prompts from config or defaults
      let userPrompt;
      if (customPrompt) {
        userPrompt = customPrompt;
      } else {
        userPrompt = this.configManager.getPrompt(strategy, 'user', variables);
      }

      const systemPromptText = systemPrompt || this.configManager.getPrompt(strategy, 'system', variables);

      const synthesis = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPromptText
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature,
      });

      return {
        synthesized: synthesis.choices[0].message.content,
        sources: responses,
        strategy,
        provider: this.name,
        timestamp: new Date().toISOString(),
        metadata: {
          model: synthesis.model,
          usage: synthesis.usage,
          finishReason: synthesis.choices[0].finish_reason
        }
      };
    } catch (error) {
      throw new Error(`OpenAI Synthesis Error: ${error.message}`);
    }
  }

  /**
   * Format response texts for prompt substitution
   * @param {Array} responses - Provider responses
   * @returns {string} Formatted response texts
   */
  formatResponseTexts(responses) {
    return responses.map((response, index) => {
      return `Response from ${response.source} (${response.model}):
${response.response}`;
    }).join('\n\n');
  }

  /**
   * Reload configuration
   */
  reloadConfig() {
    this.configManager.reloadConfig();
  }

  /**
   * Get available strategies
   * @returns {Array} List of available strategies
   */
  getAvailableStrategies() {
    return this.configManager.getAvailableStrategies();
  }
}

/**
 * Synthesis strategies for combining multiple AI provider responses
 */
class SynthesisEngine {
  constructor(config = {}) {
    this.defaultProvider = null;
    this.providers = new Map();
    
    // Set up default provider if not disabled
    if (config.provider !== false) {
      this.defaultProvider = new OpenAISynthesisProvider(config);
    }
  }

  /**
   * Register a synthesis provider
   * @param {string} name - Provider name
   * @param {BaseSynthesisProvider|Object} provider - Provider instance or configuration
   */
  registerProvider(name, provider) {
    if (provider && typeof provider.synthesize === 'function') {
      // Provider instance
      this.providers.set(name, provider);
    } else {
      // Configuration object - assume OpenAI for now
      this.providers.set(name, new OpenAISynthesisProvider(provider));
    }
  }

  /**
   * Get a synthesis provider
   * @param {string} name - Provider name
   * @returns {BaseSynthesisProvider} Provider instance
   */
  getProvider(name) {
    if (name) {
      const provider = this.providers.get(name);
      if (!provider) {
        throw new Error(`Synthesis provider not found: ${name}`);
      }
      return provider;
    }
    
    // Return default provider
    if (!this.defaultProvider) {
      throw new Error('No default synthesis provider configured');
    }
    return this.defaultProvider;
  }

  /**
   * Get all registered synthesis providers
   * @returns {Array} List of provider names
   */
  getProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Set default synthesis provider
   * @param {string} name - Provider name
   */
  setDefaultProvider(name) {
    const provider = this.getProvider(name);
    this.defaultProvider = provider;
  }

  /**
   * Synthesize multiple responses
   * @param {Array} responses - Array of provider responses
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} Synthesized response
   */
  async synthesize(responses, options = {}) {
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error('Responses must be a non-empty array');
    }

    const {
      provider: providerName,
      ...synthesisOptions
    } = options;

    const provider = this.getProvider(providerName);
    return provider.synthesize(responses, synthesisOptions);
  }

  /**
   * Synthesize with custom logic (for advanced users)
   * @param {Array} responses - Provider responses
   * @param {Function} customLogic - Custom synthesis function
   * @returns {Promise<Object>} Custom synthesis result
   */
  async synthesizeWithCustomLogic(responses, customLogic) {
    if (typeof customLogic !== 'function') {
      throw new Error('Custom logic must be a function');
    }

    try {
      const result = await customLogic(responses);
      return {
        synthesized: result,
        sources: responses,
        strategy: 'custom',
        provider: 'custom',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Custom Synthesis Error: ${error.message}`);
    }
  }

  /**
   * Remove a synthesis provider
   * @param {string} name - Provider name
   */
  removeProvider(name) {
    this.providers.delete(name);
  }

  /**
   * Clear all synthesis providers
   */
  clearProviders() {
    this.providers.clear();
    this.defaultProvider = null;
  }

  /**
   * Get provider metadata
   * @param {string} name - Provider name
   * @returns {Object} Provider metadata
   */
  getProviderMetadata(name) {
    const provider = this.getProvider(name);
    return provider.getMetadata();
  }

  /**
   * Get metadata for all providers
   * @returns {Object} Map of provider metadata
   */
  getAllProviderMetadata() {
    const metadata = {};
    for (const [name, provider] of this.providers) {
      metadata[name] = provider.getMetadata();
    }
    if (this.defaultProvider) {
      metadata.default = this.defaultProvider.getMetadata();
    }
    return metadata;
  }
}

module.exports = {
  SynthesisEngine,
  SynthesisConfigManager,
  BaseSynthesisProvider,
  OpenAISynthesisProvider
}; 