const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ITEMS_TABLE = process.env.ITEMS_TABLE;

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const { name, description } = JSON.parse(event.body);
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

    const updatedItem = {
      ...existingItem.Item,
      name: name !== undefined ? name : existingItem.Item.name,
      description: description !== undefined ? description : existingItem.Item.description,
      updatedAt: new Date().toISOString()
    };

    await dynamoDb.put({
      TableName: ITEMS_TABLE,
      Item: updatedItem
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(updatedItem)
    };
  } catch (error) {
    console.error('Update item error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
