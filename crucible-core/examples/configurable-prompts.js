const { 
  CrucibleCore, 
  SynthesisConfigManager 
} = require('../src/index');
const fs = require('fs');
const path = require('path');

// Example 1: Using default hardcoded prompts
async function defaultPromptsExample() {
  console.log('🚀 Crucible Core - Default Hardcoded Prompts\n');

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
    // Query providers
    const result = await crucible.query(
      "What is artificial intelligence?",
      ['openai', 'deepseek']
    );

    // Use default hardcoded prompts
    console.log('🔄 Using default hardcoded prompts...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Default Synthesis Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');
    console.log('Strategy used:', synthesis.strategy);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example 2: Using custom configuration file in application directory
async function customConfigExample() {
  console.log('\n\n⚙️ Crucible Core - Custom Configuration File in Application Directory\n');

  // Create a custom config file in the application directory (current working directory)
  const customConfig = {
    "combine_user_prompt": "You have received {{responseCount}} AI responses about the same topic. Your task is to create a unified response that:\n1. Merges the best insights from each source\n2. Addresses any conflicting information\n3. Provides a balanced, comprehensive view\n4. Maintains clarity and coherence\n\n{{responseTexts}}\n\nPlease create a unified response that combines these perspectives effectively.",
    
    "combine_system_prompt": "You are a master synthesizer who excels at combining multiple perspectives into clear, coherent, and comprehensive responses.",
    
    "custom_strategy_user_prompt": "Below are {{responseCount}} AI responses about the same topic. Please analyze these responses and provide:\n1. A critical evaluation of each response\n2. Identification of strengths and weaknesses\n3. A synthesis that leverages the best aspects of each\n4. Recommendations for improvement\n\n{{responseTexts}}\n\nPlease provide a critical analysis and synthesis.",
    
    "custom_strategy_system_prompt": "You are a critical analyst who can evaluate AI responses and provide insightful synthesis with recommendations."
  };

  // Write custom config to application directory
  const configPath = path.join(process.cwd(), 'crucible-synthesis-config.json');
  fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));
  console.log(`Created config file at: ${configPath}`);

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
      // No configPath specified - will automatically find the config file
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
      "Explain machine learning concepts",
      ['openai', 'deepseek']
    );

    // Use custom configured prompts
    console.log('🔄 Using custom configured prompts...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Custom Config Synthesis Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');
    console.log('Strategy used:', synthesis.strategy);

    // Use custom strategy
    console.log('\n🔄 Using custom strategy...');
    const customSynthesis = await crucible.synthesize(result.responses, {
      strategy: 'custom_strategy'
    });

    console.log('✅ Custom Strategy Result:');
    console.log(customSynthesis.synthesized.substring(0, 200) + '...');
    console.log('Strategy used:', customSynthesis.strategy);

    // Show available strategies
    console.log('\n📋 Available strategies:');
    const strategies = crucible.getAvailableSynthesisStrategies();
    console.log(strategies);

    // Clean up
    fs.unlinkSync(configPath);
    console.log(`Removed config file: ${configPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Clean up on error
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(`Removed config file: ${configPath}`);
    }
  }
}

// Example 3: Using explicit config path
async function explicitConfigPathExample() {
  console.log('\n\n📁 Crucible Core - Explicit Config Path\n');

  // Create config in a specific location
  const configDir = path.join(process.cwd(), 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  const configPath = path.join(configDir, 'my-synthesis-config.json');
  const customConfig = {
    "combine_user_prompt": "You have {{responseCount}} AI responses to synthesize. Create a unified response that:\n1. Integrates key insights from all sources\n2. Resolves any discrepancies\n3. Provides a comprehensive overview\n4. Maintains accuracy and clarity\n\n{{responseTexts}}\n\nPlease provide a unified synthesis.",
    
    "combine_system_prompt": "You are an expert at creating unified, accurate syntheses from multiple AI responses."
  };

  fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));
  console.log(`Created config file at: ${configPath}`);

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      configPath: configPath // Explicit path
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
      "What is blockchain technology?",
      ['openai', 'deepseek']
    );

    // Use explicit config path
    console.log('🔄 Using explicit config path...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Explicit Config Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');

    // Clean up
    fs.unlinkSync(configPath);
    if (fs.existsSync(configDir) && fs.readdirSync(configDir).length === 0) {
      fs.rmdirSync(configDir);
    }
    console.log(`Removed config file: ${configPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Clean up on error
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(`Removed config file: ${configPath}`);
    }
    if (fs.existsSync(configDir) && fs.readdirSync(configDir).length === 0) {
      fs.rmdirSync(configDir);
    }
  }
}

// Example 4: Environment variable configuration
async function environmentConfigExample() {
  console.log('\n\n🌍 Crucible Core - Environment Variable Configuration\n');

  // Create config for environment variable
  const envConfig = {
    "combine_user_prompt": "You have {{responseCount}} AI responses to synthesize. Create a unified response that:\n1. Integrates key insights from all sources\n2. Resolves any discrepancies\n3. Provides a comprehensive overview\n4. Maintains accuracy and clarity\n\n{{responseTexts}}\n\nPlease provide a unified synthesis.",
    
    "combine_system_prompt": "You are an expert at creating unified, accurate syntheses from multiple AI responses."
  };

  // Write to a file that will be referenced by environment variable
  const envConfigPath = path.join(process.cwd(), 'env-synthesis-config.json');
  fs.writeFileSync(envConfigPath, JSON.stringify(envConfig, null, 2));
  console.log(`Created config file at: ${envConfigPath}`);

  // Set environment variable
  process.env.CRUCIBLE_SYNTHESIS_CONFIG = envConfigPath;

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4'
      // No configPath specified - will use environment variable
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
      "What is cloud computing?",
      ['openai']
    );

    // Use environment-configured prompts
    console.log('🔄 Using environment-configured prompts...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Environment Config Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');

    // Clean up
    fs.unlinkSync(envConfigPath);
    delete process.env.CRUCIBLE_SYNTHESIS_CONFIG;
    console.log(`Removed config file: ${envConfigPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Clean up on error
    if (fs.existsSync(envConfigPath)) {
      fs.unlinkSync(envConfigPath);
      console.log(`Removed config file: ${envConfigPath}`);
    }
    delete process.env.CRUCIBLE_SYNTHESIS_CONFIG;
  }
}

// Example 5: Dynamic configuration reloading
async function dynamicConfigReloadExample() {
  console.log('\n\n🔄 Crucible Core - Dynamic Configuration Reloading\n');

  // Initial config
  const initialConfig = {
    "combine_user_prompt": "Initial prompt: {{responseCount}} responses to combine.\n\n{{responseTexts}}\n\nPlease combine these responses."
  };

  const configPath = path.join(process.cwd(), 'dynamic-config.json');
  fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
  console.log(`Created initial config file at: ${configPath}`);

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      configPath: configPath
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
      "What is machine learning?",
      ['openai']
    );

    // Use initial config
    console.log('🔄 Using initial configuration...');
    const initialSynthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Initial Config Result:');
    console.log(initialSynthesis.synthesized.substring(0, 100) + '...');

    // Update config file
    const updatedConfig = {
      "combine_user_prompt": "Updated prompt: {{responseCount}} responses to synthesize with enhanced instructions.\n\n{{responseTexts}}\n\nPlease provide an enhanced synthesis."
    };

    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log(`Updated config file at: ${configPath}`);

    // Reload configuration
    console.log('\n🔄 Reloading configuration...');
    crucible.reloadSynthesisConfig();

    // Use updated config
    console.log('🔄 Using updated configuration...');
    const updatedSynthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Updated Config Result:');
    console.log(updatedSynthesis.synthesized.substring(0, 100) + '...');

    // Clean up
    fs.unlinkSync(configPath);
    console.log(`Removed config file: ${configPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Clean up on error
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(`Removed config file: ${configPath}`);
    }
  }
}

// Example 6: Variable substitution in prompts
async function variableSubstitutionExample() {
  console.log('\n\n🔧 Crucible Core - Variable Substitution in Prompts\n');

  // Config with custom variables
  const varConfig = {
    "combine_user_prompt": "You have {{responseCount}} AI responses about the same topic. The responses are from different models and may have varying perspectives.\n\n{{responseTexts}}\n\nPlease create a synthesis that combines these {{responseCount}} perspectives into a unified response.",
    
    "combine_system_prompt": "You are an expert synthesizer who can combine {{responseCount}} different AI responses into a coherent whole."
  };

  const configPath = path.join(process.cwd(), 'var-config.json');
  fs.writeFileSync(configPath, JSON.stringify(varConfig, null, 2));
  console.log(`Created config file at: ${configPath}`);

  const crucible = new CrucibleCore({
    synthesis: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      configPath: configPath
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
    // Query multiple providers to test variable substitution
    const result = await crucible.query(
      "What is the future of renewable energy?",
      ['openai', 'deepseek']
    );

    console.log('🔄 Using prompts with variable substitution...');
    const synthesis = await crucible.synthesize(result.responses, {
      strategy: 'combine'
    });

    console.log('✅ Variable Substitution Result:');
    console.log(synthesis.synthesized.substring(0, 200) + '...');
    console.log('Response count:', result.responses.length);

    // Clean up
    fs.unlinkSync(configPath);
    console.log(`Removed config file: ${configPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    // Clean up on error
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(`Removed config file: ${configPath}`);
    }
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

  await defaultPromptsExample();
  await customConfigExample();
  await explicitConfigPathExample();
  await environmentConfigExample();
  await dynamicConfigReloadExample();
  await variableSubstitutionExample();
  
  console.log('\n🎉 All examples completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  defaultPromptsExample,
  customConfigExample,
  explicitConfigPathExample,
  environmentConfigExample,
  dynamicConfigReloadExample,
  variableSubstitutionExample
}; 