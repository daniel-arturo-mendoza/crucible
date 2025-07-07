const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

// Use local DynamoDB for development
const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

async function testDynamoDB() {
  console.log('Testing DynamoDB connectivity...');
  
  try {
    console.log('Sending ListTablesCommand...');
    const result = await client.send(new ListTablesCommand({}));
    console.log('✅ DynamoDB is responding!');
    console.log('Existing tables:', result.TableNames || []);
  } catch (error) {
    console.error('❌ DynamoDB test failed:', error.message);
  }
}

testDynamoDB().catch(console.error); 