const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB({
  endpoint: 'http://dynamodb:8000',
  region: 'us-east-1',
  accessKeyId: 'local',
  secretAccessKey: 'local'
});

const createTable = async (params) => {
  try {
    await dynamoDb.createTable(params).promise();
    console.log(`Created table: ${params.TableName}`);
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`Table ${params.TableName} already exists`);
    } else {
      console.error(`Error creating table ${params.TableName}:`, error);
      throw error;
    }
  }
};

const initTables = async () => {
  // Create Users table
  await createTable({
    TableName: 'UsersTable',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  // Create Items table
  await createTable({
    TableName: 'ItemsTable',
    KeySchema: [
      { AttributeName: 'itemId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'itemId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  console.log('All tables created successfully');
};

initTables().catch(console.error);
