const { CrucibleCore } = require('../src/index');

// Example 1: Library WITHOUT synthesis engine (pure multi-provider querying)
async function withoutSynthesisExample() {
  console.log('🚀 Crucible Core - WITHOUT Synthesis Engine\n');

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

  try {
    // Query multiple providers - returns raw responses
    console.log('📝 Querying multiple providers (no synthesis)...');
    const result = await crucible.query(
      "What are the benefits of using multiple AI models?",
      ['openai', 'deepseek']
    );

    console.log(`✅ Successfully queried ${result.successful} providers`);
    console.log(`❌ Failed queries: ${result.failed.length}`);
    
    // Access raw responses from each provider
    result.responses.forEach(response => {
      console.log(`\n🤖 ${response.source} (${response.model}):`);
      console.log(response.response.substring(0, 200) + '...');
    });

    // Check synthesis status
    console.log('\n🔍 Synthesis engine enabled:', crucible.isSynthesisEnabled()); // false

    // Try to use synthesis (will throw error)
    try {
      await crucible.queryAndSynthesize("test", ['openai']);
    } catch (error) {
      console.log('✅ Properly caught synthesis error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 2: Library WITH synthesis engine
async function withSynthesisExample() {
  console.log('\n\n🔄 Crucible Core - WITH Synthesis Engine\n');

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

  try {
    // Query and synthesize in one call
    console.log('🔄 Querying and synthesizing responses...');
    const synthesis = await crucible.queryAndSynthesize(
      "Explain quantum computing in simple terms",
      ['openai', 'deepseek'],
      { temperature: 0.5 }, // Query options
      { strategy: 'combine' } // Synthesis options
    );

    console.log('\n🎯 Synthesized Response:');
    console.log(synthesis.synthesized);

    console.log('\n📊 Original Responses:');
    synthesis.sources.forEach(response => {
      console.log(`\n🤖 ${response.source}:`);
      console.log(response.response.substring(0, 100) + '...');
    });

    // Check synthesis status
    console.log('\n🔍 Synthesis engine enabled:', crucible.isSynthesisEnabled()); // true

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 3: Dynamic synthesis engine management
async function dynamicSynthesisExample() {
  console.log('\n\n⚙️ Crucible Core - Dynamic Synthesis Management\n');

  // Start without synthesis
  const crucible = new CrucibleCore({
    synthesis: false,
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      }
    }
  });

  try {
    // Query without synthesis
    console.log('📝 Querying without synthesis...');
    const result = await crucible.query(
      "What is machine learning?",
      ['openai']
    );

    console.log('✅ Raw response:', result.responses[0].response.substring(0, 100) + '...');

    // Enable synthesis engine dynamically
    console.log('\n🔄 Enabling synthesis engine...');
    crucible.enableSynthesis({
      model: 'gpt-4',
      temperature: 0.2
    });

    console.log('🔍 Synthesis engine enabled:', crucible.isSynthesisEnabled()); // true

    // Now we can synthesize
    console.log('\n🎯 Synthesizing existing responses...');
    const synthesis = await crucible.synthesize(
      result.responses,
      { strategy: 'combine' }
    );

    console.log('✅ Synthesized response:', synthesis.synthesized.substring(0, 100) + '...');

    // Disable synthesis engine
    console.log('\n🔄 Disabling synthesis engine...');
    crucible.disableSynthesis();

    console.log('🔍 Synthesis engine enabled:', crucible.isSynthesisEnabled()); // false

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 4: Custom synthesis logic (without built-in synthesis engine)
async function customSynthesisExample() {
  console.log('\n\n🔧 Custom Synthesis Logic (No Built-in Engine)\n');

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
      "What is the future of AI?",
      ['openai', 'deepseek']
    );

    // Custom synthesis logic
    console.log('🔧 Applying custom synthesis logic...');
    
    // Simple concatenation synthesis
    const simpleSynthesis = result.responses
      .map(r => `${r.source}: ${r.response}`)
      .join('\n\n---\n\n');

    console.log('\n📝 Simple Concatenation Synthesis:');
    console.log(simpleSynthesis.substring(0, 300) + '...');

    // Custom voting synthesis
    const votingSynthesis = {
      totalProviders: result.responses.length,
      responses: result.responses.map(r => ({
        provider: r.source,
        content: r.response,
        length: r.response.length,
        hasKeywords: r.response.toLowerCase().includes('artificial intelligence')
      })),
      summary: `Received ${result.responses.length} responses with average length of ${
        Math.round(result.responses.reduce((sum, r) => sum + r.response.length, 0) / result.responses.length)
      } characters`
    };

    console.log('\n🗳️ Custom Voting Synthesis:');
    console.log(JSON.stringify(votingSynthesis, null, 2));

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

  await withoutSynthesisExample();
  await withSynthesisExample();
  await dynamicSynthesisExample();
  await customSynthesisExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  withoutSynthesisExample,
  withSynthesisExample,
  dynamicSynthesisExample,
  customSynthesisExample
}; 