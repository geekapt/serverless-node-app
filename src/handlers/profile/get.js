const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    
    const result = await dynamoDb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Don't send password back
    const { password, ...userWithoutPassword } = result.Item;
    
    return {
      statusCode: 200,
      body: JSON.stringify(userWithoutPassword)
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
