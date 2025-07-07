const { execSync } = require('child_process');
const path = require('path');

// Helper function to wait for DynamoDB to be ready
async function waitForDynamoDB() {
  const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
  
  const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'local',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  });

  console.log('⏳ Waiting for DynamoDB to be ready...');
  
  for (let i = 0; i < 30; i++) { // Try for up to 30 seconds
    try {
      await client.send(new ListTablesCommand({}));
      console.log('✅ DynamoDB is ready!');
      return true;
    } catch (error) {
      if (i % 5 === 0) { // Log every 5 attempts
        console.log(`⏳ Still waiting for DynamoDB... (attempt ${i + 1}/30)`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('DynamoDB failed to start within 30 seconds');
}

// Helper function to create tables with retry
async function createTables() {
  console.log('📊 Creating DynamoDB tables...');
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync('node scripts/create-tables.js', { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log('✅ DynamoDB tables created successfully!');
      return;
    } catch (error) {
      console.warn(`⚠️  Table creation attempt ${attempt} failed:`, error.message);
      if (attempt < 3) {
        console.log(`🔄 Retrying table creation in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error(`Failed to create tables after ${attempt} attempts`);
      }
    }
  }
}

module.exports = async () => {
  try {
    // Start DynamoDB
    console.log('🚀 Starting DynamoDB...');
    execSync('docker-compose up -d', { stdio: 'inherit', cwd: __dirname + '/../' });
    
    // Wait for DynamoDB to be ready
    await waitForDynamoDB();
    
    // Create tables with retry
    await createTables();
    
    console.log('🎉 Test environment setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error.message);
    throw error; // Re-throw to fail the test setup
  }
}; 