const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ITEMS_TABLE = process.env.ITEMS_TABLE;

module.exports.handler = async (event) => {
  try {
    const { name, description } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.userId;
    
    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name is required' })
      };
    }

    const item = {
      itemId: uuidv4(),
      userId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDb.put({
      TableName: ITEMS_TABLE,
      Item: item
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify(item)
    };
  } catch (error) {
    console.error('Create item error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
