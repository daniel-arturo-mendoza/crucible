const { CrucibleCore } = require('../src/index');

// Example: Programmatic Strategy Management
async function strategyManagementExample() {
  console.log('🚀 Crucible Core - Programmatic Strategy Management\n');

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
    // Query providers first
    const result = await crucible.query(
      "What is machine learning?",
      ['openai', 'deepseek']
    );

    console.log('📋 Initial available strategies:');
    console.log(crucible.getAvailableSynthesisStrategies());

    // Example 1: Add a new custom strategy
    console.log('\n➕ Adding custom strategy: "simplify"');
    crucible.addSynthesisStrategy(
      'simplify',
      'You have {{responseCount}} AI responses about the same topic. Your task is to create a simplified version that:\n1. Uses simple, clear language\n2. Removes technical jargon\n3. Makes the content accessible to beginners\n4. Maintains accuracy while improving clarity\n\n{{responseTexts}}\n\nPlease provide a simplified explanation.',
      'You are an expert at simplifying complex information and making it accessible to everyone. You excel at clear communication and removing unnecessary complexity.'
    );

    console.log('✅ Strategy added successfully!');
    console.log('📋 Updated strategies:', crucible.getAvailableSynthesisStrategies());

    // Use the new strategy
    console.log('\n🔄 Using new "simplify" strategy...');
    const simplifyResult = await crucible.synthesize(result.responses, {
      strategy: 'simplify'
    });

    console.log('✅ Simplify Result:');
    console.log(simplifyResult.synthesized.substring(0, 200) + '...');

    // Example 2: Add another custom strategy
    console.log('\n➕ Adding custom strategy: "bullet_points"');
    crucible.addSynthesisStrategy(
      'bullet_points',
      'You have {{responseCount}} AI responses about the same topic. Please create a bullet-point summary that:\n1. Extracts key points from all responses\n2. Organizes information logically\n3. Uses clear, concise bullet points\n4. Eliminates redundancy\n\n{{responseTexts}}\n\nPlease provide a bullet-point summary.',
      'You are an expert at creating clear, organized bullet-point summaries. You can distill complex information into key points effectively.'
    );

    // Use the bullet points strategy
    console.log('\n🔄 Using "bullet_points" strategy...');
    const bulletResult = await crucible.synthesize(result.responses, {
      strategy: 'bullet_points'
    });

    console.log('✅ Bullet Points Result:');
    console.log(bulletResult.synthesized.substring(0, 200) + '...');

    // Example 3: Check if strategies exist
    console.log('\n🔍 Checking strategy existence:');
    console.log('Has "simplify" strategy:', crucible.hasSynthesisStrategy('simplify'));
    console.log('Has "bullet_points" strategy:', crucible.hasSynthesisStrategy('bullet_points'));
    console.log('Has "nonexistent" strategy:', crucible.hasSynthesisStrategy('nonexistent'));

    // Example 4: Get strategy details
    console.log('\n📖 Getting strategy details:');
    const simplifyStrategy = crucible.getSynthesisStrategy('simplify');
    console.log('Simplify strategy user prompt:', simplifyStrategy.user.substring(0, 100) + '...');
    console.log('Simplify strategy system prompt:', simplifyStrategy.system.substring(0, 100) + '...');

    // Example 5: Update a strategy
    console.log('\n✏️ Updating "simplify" strategy...');
    crucible.updateSynthesisStrategy(
      'simplify',
      'You have {{responseCount}} AI responses about the same topic. Create an ULTRA-SIMPLIFIED version that:\n1. Uses only basic vocabulary\n2. Explains concepts like you would to a 10-year-old\n3. Uses analogies and examples\n4. Breaks down complex ideas into simple steps\n\n{{responseTexts}}\n\nPlease provide an ultra-simplified explanation.',
      'You are a master at explaining complex topics in the simplest possible terms. You make everything easy to understand.'
    );

    console.log('✅ Strategy updated!');

    // Use the updated strategy
    console.log('\n🔄 Using updated "simplify" strategy...');
    const updatedSimplifyResult = await crucible.synthesize(result.responses, {
      strategy: 'simplify'
    });

    console.log('✅ Updated Simplify Result:');
    console.log(updatedSimplifyResult.synthesized.substring(0, 200) + '...');

    // Example 6: Add domain-specific strategy
    console.log('\n➕ Adding domain-specific strategy: "technical_deep_dive"');
    crucible.addSynthesisStrategy(
      'technical_deep_dive',
      'You have {{responseCount}} AI responses about the same technical topic. Please provide a deep technical analysis that:\n1. Explores technical details thoroughly\n2. Identifies implementation considerations\n3. Discusses trade-offs and alternatives\n4. Provides code examples where relevant\n5. Addresses potential challenges\n\n{{responseTexts}}\n\nPlease provide a comprehensive technical deep dive.',
      'You are a senior technical architect who can provide deep, detailed technical analysis. You understand implementation details, trade-offs, and best practices.'
    );

    // Use the technical strategy
    console.log('\n🔄 Using "technical_deep_dive" strategy...');
    const technicalResult = await crucible.synthesize(result.responses, {
      strategy: 'technical_deep_dive'
    });

    console.log('✅ Technical Deep Dive Result:');
    console.log(technicalResult.synthesized.substring(0, 200) + '...');

    // Example 7: List all strategies
    console.log('\n📋 All available strategies:');
    const allStrategies = crucible.getAvailableSynthesisStrategies();
    allStrategies.forEach(strategy => {
      const details = crucible.getSynthesisStrategy(strategy);
      console.log(`- ${strategy}: ${details ? 'Custom strategy' : 'Built-in strategy'}`);
    });

    // Example 8: Remove a custom strategy
    console.log('\n🗑️ Removing "bullet_points" strategy...');
    crucible.removeSynthesisStrategy('bullet_points');
    console.log('✅ Strategy removed!');
    console.log('📋 Remaining strategies:', crucible.getAvailableSynthesisStrategies());

    // Example 9: Try to remove a built-in strategy (should fail)
    console.log('\n🚫 Trying to remove built-in "combine" strategy...');
    try {
      crucible.removeSynthesisStrategy('combine');
    } catch (error) {
      console.log('✅ Correctly prevented removal of built-in strategy:', error.message);
    }

    // Example 10: Save configuration to file
    console.log('\n💾 Saving configuration to file...');
    crucible.saveSynthesisConfig('./my-custom-strategies.json');
    console.log('✅ Configuration saved!');

    // Example 11: Demonstrate strategy persistence
    console.log('\n🔄 Creating new instance to test persistence...');
    const newCrucible = new CrucibleCore({
      synthesis: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        configPath: './my-custom-strategies.json'
      },
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4'
        }
      }
    });

    console.log('📋 Strategies in new instance:', newCrucible.getAvailableSynthesisStrategies());
    console.log('Has "simplify" strategy:', newCrucible.hasSynthesisStrategy('simplify'));

    // Clean up
    const fs = require('fs');
    if (fs.existsSync('./my-custom-strategies.json')) {
      fs.unlinkSync('./my-custom-strategies.json');
      console.log('🧹 Cleaned up temporary config file');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Dynamic Strategy Creation Based on Context
async function dynamicStrategyCreationExample() {
  console.log('\n\n🎯 Crucible Core - Dynamic Strategy Creation\n');

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
      "Explain quantum computing",
      ['openai']
    );

    // Create strategies based on user preferences
    const userPreferences = {
      expertise: 'beginner',
      format: 'step_by_step',
      detail: 'comprehensive'
    };

    // Generate strategy name based on preferences
    const strategyName = `${userPreferences.expertise}_${userPreferences.format}_${userPreferences.detail}`;

    // Create custom prompt based on preferences
    const userPrompt = `You have {{responseCount}} AI responses about the same topic. 
Create a response suitable for a ${userPreferences.expertise} level that:
${userPreferences.format === 'step_by_step' ? '- Breaks down the topic into clear steps\n- Provides a logical progression of concepts' : ''}
${userPreferences.detail === 'comprehensive' ? '- Includes comprehensive details and explanations\n- Covers all important aspects thoroughly' : ''}

{{responseTexts}}

Please provide a ${userPreferences.expertise}-friendly, ${userPreferences.format} explanation.`;

    const systemPrompt = `You are an expert educator who can adapt explanations to different expertise levels. 
You excel at ${userPreferences.format} explanations and provide ${userPreferences.detail} coverage.`;

    // Add the dynamic strategy
    console.log(`➕ Creating dynamic strategy: "${strategyName}"`);
    crucible.addSynthesisStrategy(strategyName, userPrompt, systemPrompt);

    // Use the dynamic strategy
    console.log(`🔄 Using dynamic strategy: "${strategyName}"`);
    const dynamicResult = await crucible.synthesize(result.responses, {
      strategy: strategyName
    });

    console.log('✅ Dynamic Strategy Result:');
    console.log(dynamicResult.synthesized.substring(0, 200) + '...');

    // Clean up
    crucible.removeSynthesisStrategy(strategyName);
    console.log(`🗑️ Removed dynamic strategy: "${strategyName}"`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run examples
async function runExamples() {
  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set. Examples may fail.');
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('⚠️  DEEPSEEK_API_KEY not set. Examples may fail.');
  }

  await strategyManagementExample();
  await dynamicStrategyCreationExample();
  
  console.log('\n🎉 Strategy management examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  strategyManagementExample,
  dynamicStrategyCreationExample
}; 