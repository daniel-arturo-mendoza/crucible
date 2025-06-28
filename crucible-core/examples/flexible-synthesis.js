const { 
  CrucibleCore, 
  BaseSynthesisProvider, 
  OpenAISynthesisProvider 
} = require('../src/index');

// Example 1: Using different synthesis models
async function differentSynthesisModelsExample() {
  console.log('🚀 Crucible Core - Different Synthesis Models\n');

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4' // Default synthesis model
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

  try {
    // Query providers
    const result = await crucible.query(
      "What are the benefits of renewable energy?",
      ['openai', 'deepseek']
    );

    // Synthesize with different models
    console.log('🔄 Synthesizing with GPT-4...');
    const gpt4Synthesis = await crucible.synthesize(result.responses, {
      model: 'gpt-4',
      strategy: 'combine'
    });

    console.log('🔄 Synthesizing with GPT-3.5-turbo...');
    const gpt35Synthesis = await crucible.synthesize(result.responses, {
      model: 'gpt-3.5-turbo',
      strategy: 'combine'
    });

    console.log('\n📊 GPT-4 Synthesis:');
    console.log(gpt4Synthesis.synthesized.substring(0, 200) + '...');
    console.log('Model used:', gpt4Synthesis.metadata.model);

    console.log('\n📊 GPT-3.5-turbo Synthesis:');
    console.log(gpt35Synthesis.synthesized.substring(0, 200) + '...');
    console.log('Model used:', gpt35Synthesis.metadata.model);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 2: Custom synthesis provider
async function customSynthesisProviderExample() {
  console.log('\n\n🔧 Custom Synthesis Provider Example\n');

  // Create a custom synthesis provider
  class ClaudeSynthesisProvider extends BaseSynthesisProvider {
    constructor(config = {}) {
      super({ name: 'Claude', ...config });
      this.apiKey = config.apiKey || process.env.CLAUDE_API_KEY;
      this.apiUrl = config.apiUrl || 'https://api.anthropic.com/v1';
    }

    validateConfig() {
      if (!this.apiKey) {
        throw new Error('Claude API key is required');
      }
      return true;
    }

    async synthesize(responses, options = {}) {
      try {
        this.validateConfig();

        const {
          model = 'claude-3-sonnet',
          strategy = 'combine',
          customPrompt
        } = options;

        // Build prompt for Claude
        let prompt;
        if (customPrompt) {
          prompt = customPrompt;
        } else {
          const responseTexts = responses.map(r => 
            `${r.source}: ${r.response}`
          ).join('\n\n');
          
          prompt = `Below are responses from ${responses.length} AI models. Please synthesize them into a comprehensive answer:\n\n${responseTexts}`;
        }

        // Simulate Claude API call (replace with actual implementation)
        const synthesis = {
          content: `Claude synthesis of ${responses.length} responses: ${prompt.substring(0, 100)}...`,
          model: model,
          usage: { total_tokens: 150 }
        };

        return {
          synthesized: synthesis.content,
          sources: responses,
          strategy,
          provider: this.name,
          timestamp: new Date().toISOString(),
          metadata: {
            model: synthesis.model,
            usage: synthesis.usage
          }
        };
      } catch (error) {
        throw new Error(`Claude Synthesis Error: ${error.message}`);
      }
    }
  }

  const crucible = new CrucibleCore({
    synthesis: false, // Start without synthesis
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

  try {
    // Enable synthesis engine
    crucible.enableSynthesis();

    // Register custom Claude synthesis provider
    crucible.registerSynthesisProvider('claude', new ClaudeSynthesisProvider({
      apiKey: process.env.CLAUDE_API_KEY
    }));

    // Query providers
    const result = await crucible.query(
      "Explain machine learning concepts",
      ['openai', 'deepseek']
    );

    // Synthesize with custom Claude provider
    console.log('🔄 Synthesizing with custom Claude provider...');
    const claudeSynthesis = await crucible.synthesize(result.responses, {
      provider: 'claude',
      model: 'claude-3-sonnet',
      strategy: 'combine'
    });

    console.log('✅ Claude Synthesis:');
    console.log(claudeSynthesis.synthesized);
    console.log('Provider used:', claudeSynthesis.provider);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 3: Multiple synthesis providers
async function multipleSynthesisProvidersExample() {
  console.log('\n\n🔄 Multiple Synthesis Providers Example\n');

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
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

  try {
    // Register additional synthesis providers
    crucible.registerSynthesisProvider('gpt35', {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    });

    // Query providers
    const result = await crucible.query(
      "What is the future of AI?",
      ['openai', 'deepseek']
    );

    // Synthesize with different providers
    const providers = ['default', 'gpt35'];
    
    for (const providerName of providers) {
      console.log(`🔄 Synthesizing with ${providerName} provider...`);
      
      const synthesis = await crucible.synthesize(result.responses, {
        provider: providerName === 'default' ? undefined : providerName,
        strategy: 'combine'
      });

      console.log(`\n📊 ${providerName.toUpperCase()} Synthesis:`);
      console.log(synthesis.synthesized.substring(0, 150) + '...');
      console.log('Provider:', synthesis.provider);
      console.log('Model:', synthesis.metadata.model);
    }

    // Show all available synthesis providers
    console.log('\n📋 Available synthesis providers:');
    const metadata = crucible.getAllSynthesisProviderMetadata();
    console.log(JSON.stringify(metadata, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 4: Custom synthesis logic with provider selection
async function customSynthesisLogicExample() {
  console.log('\n\n🎯 Custom Synthesis Logic Example\n');

  const crucible = new CrucibleCore({
    synthesis: false, // No built-in synthesis
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

  try {
    // Query providers
    const result = await crucible.query(
      "Compare Python vs JavaScript",
      ['openai', 'deepseek']
    );

    // Custom synthesis logic that chooses provider based on content
    console.log('🔧 Applying custom synthesis logic...');
    
    const customSynthesis = await crucible.synthesis.synthesizeWithCustomLogic(
      result.responses,
      async (responses) => {
        // Analyze responses to choose synthesis approach
        const totalLength = responses.reduce((sum, r) => sum + r.response.length, 0);
        const avgLength = totalLength / responses.length;
        
        if (avgLength > 500) {
          // Long responses - use comparison strategy
          return `COMPARISON ANALYSIS: ${responses.length} detailed responses analyzed. Average length: ${Math.round(avgLength)} characters. Key differences identified.`;
        } else {
          // Short responses - use combination strategy
          return `COMBINED SUMMARY: ${responses.length} concise responses merged. Total content: ${totalLength} characters.`;
        }
      }
    );

    console.log('✅ Custom Synthesis Result:');
    console.log(synthesis.synthesized);
    console.log('Strategy:', synthesis.strategy);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 5: Dynamic synthesis provider management
async function dynamicSynthesisManagementExample() {
  console.log('\n\n⚙️ Dynamic Synthesis Provider Management\n');

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
    },
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    }
  });

  try {
    // Query providers
    const result = await crucible.query(
      "What is blockchain technology?",
      ['openai']
    );

    // Show initial synthesis provider
    console.log('📋 Initial synthesis providers:');
    console.log(crucible.getAllSynthesisProviderMetadata());

    // Add new synthesis provider
    console.log('\n➕ Adding new synthesis provider...');
    crucible.registerSynthesisProvider('gpt35', {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    });

    // Change default synthesis provider
    console.log('\n🔄 Changing default synthesis provider...');
    crucible.setDefaultSynthesisProvider('gpt35');

    // Synthesize with new default
    console.log('\n🎯 Synthesizing with new default provider...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Synthesis Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');
    console.log('Provider used:', synthesis.provider);

    // Show updated synthesis providers
    console.log('\n📋 Updated synthesis providers:');
    console.log(crucible.getAllSynthesisProviderMetadata());

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all examples
async function runExamples() {
  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set. Examples may fail.');
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('⚠️  DEEPSEEK_API_KEY not set. Examples may fail.');
  }

  await differentSynthesisModelsExample();
  await customSynthesisProviderExample();
  await multipleSynthesisProvidersExample();
  await customSynthesisLogicExample();
  await dynamicSynthesisManagementExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  differentSynthesisModelsExample,
  customSynthesisProviderExample,
  multipleSynthesisProvidersExample,
  customSynthesisLogicExample,
  dynamicSynthesisManagementExample
}; 