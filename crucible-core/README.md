# Crucible Core

A modular library for multi-provider AI querying and response orchestration. Extract the core logic for querying multiple AI providers in parallel with optional synthesis capabilities.

## Features

- **Multi-Provider Support**: Query multiple AI providers simultaneously
- **Modular Architecture**: Easy to add new providers and synthesis strategies
- **Standardized Responses**: Consistent response format across all providers
- **Parallel Execution**: Query all providers in parallel for optimal performance
- **Optional Synthesis**: Built-in synthesis engine that can be enabled/disabled
- **Flexible Synthesis**: Multiple synthesis strategies or custom logic
- **Configurable Prompts**: Customize synthesis prompts via configuration files
- **Error Handling**: Graceful handling of provider failures
- **TypeScript Ready**: Full TypeScript support (coming soon)

## Installation

```bash
npm install crucible-core
```

## Quick Start

### Without Synthesis (Pure Multi-Provider Querying)

```javascript
const { CrucibleCore } = require('crucible-core');

// Initialize WITHOUT synthesis engine
const crucible = new CrucibleCore({
  synthesis: false, // Explicitly disable synthesis
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      apiUrl: process.env.DEEPSEEK_API_URL
    }
  }
});

// Query multiple providers - returns raw responses
const result = await crucible.query(
  "What are the latest developments in AI?",
  ['openai', 'deepseek']
);

console.log(result.responses); // Array of provider responses
console.log(result.failed); // Array of failed queries
```

### With Synthesis (Query + Combine)

```javascript
const { CrucibleCore } = require('crucible-core');

// Initialize WITH synthesis engine (default)
const crucible = new CrucibleCore({
  synthesis: {
    model: 'gpt-4',
    temperature: 0.3
  },
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      apiUrl: process.env.DEEPSEEK_API_URL
    }
  }
});

// Query and synthesize in one call
const synthesis = await crucible.queryAndSynthesize(
  "Explain quantum computing",
  ['openai', 'deepseek'],
  { temperature: 0.7 }, // Query options
  { strategy: 'combine' } // Synthesis options
);

console.log(synthesis.synthesized); // Combined response
console.log(synthesis.sources); // Original responses
```

## Backend Integration

This library is designed to be used as a core component in larger applications. In the Crucible project, it's integrated as a local dependency in the backend:

### Backend Usage

```javascript
// In backend/src/app.js
const { CrucibleCore } = require('../crucible-core');

const crucible = new CrucibleCore({
  synthesis: {
    model: 'gpt-4',
    temperature: 0.3
  },
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      apiUrl: process.env.DEEPSEEK_API_URL
    }
  }
});

// Express route handlers
app.post('/query', async (req, res) => {
  const result = await crucible.query(req.body.prompt, ['openai', 'deepseek']);
  res.json(result);
});

app.post('/query-and-synthesize', async (req, res) => {
  const synthesis = await crucible.queryAndSynthesize(
    req.body.prompt, 
    ['openai', 'deepseek']
  );
  res.json(synthesis);
});
```

### Local Development Setup

For local development with the Crucible backend:

1. **Install as local dependency:**
   ```bash
   # In backend/package.json
   {
     "dependencies": {
       "crucible-core": "file:../crucible-core"
     }
   }
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Use in your application:**
   ```javascript
   const { CrucibleCore } = require('crucible-core');
   ```

This approach allows the core library to be developed independently while being used in the backend application.

## Configuration

### Synthesis Prompt Configuration

The library looks for synthesis configuration files in your **application directory** (not the library directory). You can customize synthesis prompts by creating a configuration file.

#### Configuration File Locations (searched in order):

1. **Explicit path** in constructor: `configPath: './my-config.json'`
2. **Environment variable**: `CRUCIBLE_SYNTHESIS_CONFIG=./config.json`
3. **Default locations** in your application directory:
   - `./crucible-synthesis-config.json`
   - `./config/synthesis-config.json`
   - `./synthesis-config.json`
   - `./.crucible/synthesis-config.json`

#### Configuration File Format:

Create a JSON file in your application directory:

```json
{
  "combine_user_prompt": "You have {{responseCount}} AI responses about the same topic. Your task is to create a unified response that:\n1. Merges the best insights from each source\n2. Addresses any conflicting information\n3. Provides a balanced, comprehensive view\n4. Maintains clarity and coherence\n\n{{responseTexts}}\n\nPlease create a unified response that combines these perspectives effectively.",
  
  "combine_system_prompt": "You are a master synthesizer who excels at combining multiple perspectives into clear, coherent, and comprehensive responses.",
  
  "compare_user_prompt": "Below are {{responseCount}} AI responses about the same topic. Please provide a detailed comparison that:\n1. Identifies key differences between the responses\n2. Highlights areas of agreement\n3. Evaluates the strengths and weaknesses of each approach\n4. Provides insights into why the responses might differ\n\n{{responseTexts}}\n\nPlease provide a comprehensive comparison of these responses.",
  
  "compare_system_prompt": "You are an expert at comparing and analyzing responses from different AI models, identifying patterns and differences.",
  
  "fact-check_user_prompt": "Below are {{responseCount}} AI responses about the same topic. Please fact-check these responses by:\n1. Identifying factual claims in each response\n2. Highlighting any contradictions between sources\n3. Flagging potentially incorrect information\n4. Providing a fact-checked summary\n\n{{responseTexts}}\n\nPlease provide a fact-checked synthesis of these responses.",
  
  "fact-check_system_prompt": "You are an expert fact-checker who can identify contradictions and verify information across multiple sources.",
  
  "custom_strategy_user_prompt": "Below are {{responseCount}} AI responses about the same topic. Please analyze these responses and provide:\n1. A critical evaluation of each response\n2. Identification of strengths and weaknesses\n3. A synthesis that leverages the best aspects of each\n4. Recommendations for improvement\n\n{{responseTexts}}\n\nPlease provide a critical analysis and synthesis.",
  
  "custom_strategy_system_prompt": "You are a critical analyst who can evaluate AI responses and provide insightful synthesis with recommendations."
}
```

#### Using Custom Configuration:

```javascript
const crucible = new CrucibleCore({
  synthesis: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    configPath: './my-synthesis-config.json' // Explicit path
  }
});

// Or use environment variable
// export CRUCIBLE_SYNTHESIS_CONFIG=./my-synthesis-config.json
```

#### Variable Substitution:

The configuration supports template variables that get substituted at runtime:

- `{{responseCount}}` - Number of responses
- `{{responseTexts}}` - Formatted response content

#### Fallback Behavior:

If no configuration file is found, the library uses **hardcoded default prompts** to ensure it always works.

## Advanced Usage

### Dynamic Synthesis Management

```javascript
// Start without synthesis
const crucible = new CrucibleCore({
  synthesis: false,
  providers: { /* ... */ }
});

// Query without synthesis
const result = await crucible.query(prompt, ['openai', 'deepseek']);

// Enable synthesis engine dynamically
crucible.enableSynthesis({
  model: 'gpt-4',
  temperature: 0.2
});

// Now synthesize existing responses
const synthesis = await crucible.synthesize(result.responses, {
  strategy: 'combine'
});

// Disable synthesis engine
crucible.disableSynthesis();
```

### Custom Synthesis Logic (No Built-in Engine)

```javascript
// Use library without synthesis engine
const crucible = new CrucibleCore({
  synthesis: false,
  providers: { /* ... */ }
});

// Query providers
const result = await crucible.query(prompt, ['openai', 'deepseek']);

// Apply your own synthesis logic
const customSynthesis = {
  totalProviders: result.responses.length,
  responses: result.responses.map(r => ({
    provider: r.source,
    content: r.response,
    length: r.response.length
  })),
  summary: `Received ${result.responses.length} responses`
};

// Or simple concatenation
const simpleSynthesis = result.responses
  .map(r => `${r.source}: ${r.response}`)
  .join('\n\n---\n\n');
```

### Different Synthesis Strategies

```javascript
// Use different synthesis strategies
const comparison = await crucible.queryAndSynthesize(
  "Compare React vs Vue",
  ['openai', 'deepseek'],
  {},
  { strategy: 'compare' } // Compare instead of combine
);

const factCheck = await crucible.queryAndSynthesize(
  "What happened in 2020?",
  ['openai', 'deepseek'],
  {},
  { strategy: 'fact-check' } // Fact-check the responses
);

// Use custom strategy from config file
const customAnalysis = await crucible.queryAndSynthesize(
  "Analyze AI responses",
  ['openai', 'deepseek'],
  {},
  { strategy: 'custom_strategy' } // Custom strategy from config
);
```

### Dynamic Configuration Reloading

```javascript
// Reload configuration at runtime
crucible.reloadSynthesisConfig();

// Get available strategies (including custom ones from config)
const strategies = crucible.getAvailableSynthesisStrategies();
console.log('Available strategies:', strategies);
```

## Provider Management

### Register Providers

```javascript
// Register providers individually
crucible.registerProvider('claude', {
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-sonnet'
});

// Register multiple providers at once
crucible.registerProviders({
  copilot: { /* config */ },
  codellama: { /* config */ }
});
```

### Provider Metadata

```javascript
// Get information about registered providers
const providers = crucible.getProviders(); // ['openai', 'deepseek']
const metadata = crucible.getProviderMetadata('openai');
const allMetadata = crucible.getAllProviderMetadata();
```

## Creating Custom Providers

Extend the `BaseProvider` class to create custom providers:

```javascript
const { BaseProvider } = require('crucible-core');

class CustomProvider extends BaseProvider {
  constructor(config) {
    super({ name: 'Custom', ...config });
    // Your initialization logic
  }

  async query(prompt, options = {}) {
    // Your custom query logic
    const response = await this.callCustomAPI(prompt, options);
    
    return this.createResponse(response.content, {
      model: response.model,
      usage: response.usage
    });
  }

  validateConfig() {
    // Validate your configuration
    if (!this.config.apiKey) {
      throw new Error('API key required');
    }
    return true;
  }
}

// Register your custom provider
crucible.registerProvider('custom', new CustomProvider(config));
```

## API Reference

### CrucibleCore

#### Constructor
```javascript
new CrucibleCore(config)
```

**Config Options:**
- `providers`: Object mapping provider names to configurations
- `synthesis`: Synthesis engine configuration (or `false` to disable)
  - `configPath`: Path to custom synthesis config file
  - `apiKey`: API key for synthesis provider
  - `model`: Model to use for synthesis

#### Methods

**Core Querying:**
- `query(prompt, providerNames, options)` - Query multiple providers (no synthesis)
- `querySingle(prompt, providerName, options)` - Query single provider

**Synthesis (requires synthesis engine):**
- `queryAndSynthesize(prompt, providerNames, queryOptions, synthesisOptions)` - Query and synthesize
- `synthesize(responses, options)` - Synthesize existing responses

**Synthesis Management:**
- `enableSynthesis(config)` - Enable synthesis engine
- `disableSynthesis()` - Disable synthesis engine
- `isSynthesisEnabled()` - Check if synthesis is enabled
- `getSynthesisEngine()` - Get synthesis engine instance
- `reloadSynthesisConfig()` - Reload configuration from file
- `getAvailableSynthesisStrategies()` - Get available strategies

**Provider Management:**
- `registerProvider(name, provider)` - Register a provider
- `registerProviders(providers)` - Register multiple providers
- `getProviders()` - Get all registered providers
- `getProviderMetadata(name)` - Get provider metadata
- `removeProvider(name)` - Remove a provider

### Synthesis Strategies

- `combine` - Combine responses into a single comprehensive answer
- `compare` - Compare and analyze differences between responses
- `fact-check` - Fact-check responses and identify contradictions
- `custom_strategy` - Custom strategies defined in config file

## Error Handling

The library provides comprehensive error handling:

```javascript
try {
  const result = await crucible.query(prompt, ['openai', 'deepseek']);
  
  if (result.failed.length > 0) {
    console.log('Some providers failed:', result.failed);
  }
  
  console.log('Successful responses:', result.responses);
} catch (error) {
  console.error('Query failed:', error.message);
}
```

## Use Cases

### News Analysis Project
```javascript
// Query news-focused models without synthesis
const newsResponses = await crucible.query(
  "Latest Ukraine news",
  ['openai', 'deepseek', 'claude']
);
// Apply custom news analysis logic
```

### Code Generation Project
```javascript
// Query code models and synthesize
const codeSynthesis = await crucible.queryAndSynthesize(
  "React todo component",
  ['copilot', 'claude', 'codellama'],
  { task: 'code' },
  { strategy: 'combine' }
);
```

### Text Analysis Project
```javascript
// Query analysis models without synthesis
const analysisResponses = await crucible.query(
  "Sentiment analysis",
  ['bert', 'roberta', 'gpt']
);
// Apply custom analysis algorithms
```

## Environment Variables

Set these environment variables for default provider configurations:

```bash
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
CRUCIBLE_SYNTHESIS_CONFIG=./my-synthesis-config.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 