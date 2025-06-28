const { CrucibleCore } = require('../src/index');

// Example: Basic usage of Crucible Core
async function basicExample() {
  console.log('🚀 Crucible Core - Basic Usage Example\n');

  // Initialize Crucible with provider configurations
  const crucible = new CrucibleCore({
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        temperature: 0.7
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.7
      }
    }
  });

  try {
    // Example 1: Query multiple providers
    console.log('📝 Example 1: Querying multiple providers...');
    const result = await crucible.query(
      "What are the three main benefits of using multiple AI models?",
      ['openai', 'deepseek']
    );

    console.log(`✅ Successfully queried ${result.successful} providers`);
    console.log(`❌ Failed queries: ${result.failed.length}`);
    
    result.responses.forEach(response => {
      console.log(`\n🤖 ${response.source} (${response.model}):`);
      console.log(response.response.substring(0, 200) + '...');
    });

    // Example 2: Query and synthesize
    console.log('\n\n🔄 Example 2: Querying and synthesizing responses...');
    const synthesis = await crucible.queryAndSynthesize(
      "Explain the concept of quantum computing in simple terms",
      ['openai', 'deepseek'],
      { temperature: 0.5 }, // Query options
      { strategy: 'combine' } // Synthesis options
    );

    console.log('\n🎯 Synthesized Response:');
    console.log(synthesis.synthesized);

    // Example 3: Different synthesis strategies
    console.log('\n\n🔍 Example 3: Using fact-check synthesis strategy...');
    const factCheck = await crucible.queryAndSynthesize(
      "What were the major events of 2020?",
      ['openai', 'deepseek'],
      {},
      { strategy: 'fact-check' }
    );

    console.log('\n✅ Fact-checked Response:');
    console.log(factCheck.synthesized);

    // Example 4: Provider metadata
    console.log('\n\n📊 Example 4: Provider metadata...');
    const providers = crucible.getProviders();
    console.log('Registered providers:', providers);
    
    const metadata = crucible.getAllProviderMetadata();
    console.log('Provider metadata:', JSON.stringify(metadata, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Error handling
async function errorHandlingExample() {
  console.log('\n\n🛡️ Error Handling Example\n');

  const crucible = new CrucibleCore({
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    }
  });

  try {
    // Try to query a non-existent provider
    const result = await crucible.query(
      "This should fail",
      ['openai', 'nonexistent-provider']
    );

    console.log('Unexpected success:', result);
  } catch (error) {
    console.log('✅ Properly caught error:', error.message);
  }
}

// Example: Custom provider
async function customProviderExample() {
  console.log('\n\n🔧 Custom Provider Example\n');

  const { BaseProvider } = require('../src/index');

  // Create a mock provider for demonstration
  class MockProvider extends BaseProvider {
    constructor(config) {
      super({ name: 'Mock', ...config });
    }

    async query(prompt, options = {}) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return this.createResponse(
        `Mock response to: "${prompt}"`,
        { model: 'mock-model-v1' }
      );
    }

    validateConfig() {
      return true; // Mock provider doesn't need validation
    }
  }

  const crucible = new CrucibleCore();
  
  // Register the custom provider
  crucible.registerProvider('mock', new MockProvider());

  try {
    const result = await crucible.query(
      "Test custom provider",
      ['mock']
    );

    console.log('✅ Custom provider response:', result.responses[0]);
  } catch (error) {
    console.error('❌ Custom provider error:', error.message);
  }
}

// Run examples
async function runExamples() {
  // Check if required environment variables are set
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set. Some examples may fail.');
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('⚠️  DEEPSEEK_API_KEY not set. Some examples may fail.');
  }

  await basicExample();
  await errorHandlingExample();
  await customProviderExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  basicExample,
  errorHandlingExample,
  customProviderExample
}; 