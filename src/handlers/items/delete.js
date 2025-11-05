const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ITEMS_TABLE = process.env.ITEMS_TABLE;

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const userId = event.requestContext.authorizer.userId;
    
    // First get the item by ID only
    const existingItem = await dynamoDb.get({
      TableName: ITEMS_TABLE,
      Key: { itemId: id }
    }).promise();

    if (!existingItem.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Item not found' })
      };
    }

    // Verify the item belongs to the user
    if (existingItem.Item.userId !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Delete the item
    await dynamoDb.delete({
      TableName: ITEMS_TABLE,
      Key: { itemId: id }
    }).promise();

    return {
      statusCode: 204,
      body: ''
    };
  } catch (error) {
    console.error('Delete item error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
