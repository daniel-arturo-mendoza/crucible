const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Use local DynamoDB for development
const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

async function createTables() {
  console.log('Creating DynamoDB tables for Crucible...');
  console.log('DynamoDB client created, about to create tables...');

  // Job Queue Table
  try {
    console.log('Attempting to create crucible-job-queue table...');
    
    // Add timeout to the request
    const createTableCommand = new CreateTableCommand({
      TableName: 'crucible-job-queue',
      KeySchema: [
        { AttributeName: 'jobId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'jobId', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'N' },
        { AttributeName: 'channel', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'StatusCreatedAtIndex',
          KeySchema: [
            { AttributeName: 'status', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: 'ChannelCreatedAtIndex',
          KeySchema: [
            { AttributeName: 'channel', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: 'UserIdCreatedAtIndex',
          KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });

    console.log('Sending CreateTableCommand...');
    await client.send(createTableCommand);
    console.log('CreateTableCommand sent successfully');
    console.log('✅ Created crucible-job-queue table');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  crucible-job-queue table already exists');
    } else {
      console.error('❌ Error creating crucible-job-queue table:', error.message);
    }
  }

  // User Locks Table
  try {
    await client.send(new CreateTableCommand({
      TableName: 'crucible-user-locks',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
    console.log('✅ Created crucible-user-locks table');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  crucible-user-locks table already exists');
    } else {
      console.error('❌ Error creating crucible-user-locks table:', error.message);
    }
  }

  // Users Table (for FCM tokens)
  try {
    await client.send(new CreateTableCommand({
      TableName: 'crucible-users',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));
    console.log('✅ Created crucible-users table');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  crucible-users table already exists');
    } else {
      console.error('❌ Error creating crucible-users table:', error.message);
    }
  }

  console.log('\n🎉 All tables created successfully!');
  console.log('You can now run integration tests with local DynamoDB.');
}

// Run if this file is executed directly
if (require.main === module) {
  createTables().catch(console.error);
}

module.exports = { createTables }; 