const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ITEMS_TABLE = process.env.ITEMS_TABLE;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    
    const result = await dynamoDb.query({
      TableName: ITEMS_TABLE,
      IndexName: 'UserIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items || [])
    };
  } catch (error) {
    console.error('List items error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
