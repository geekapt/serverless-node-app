const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { name, email, currentPassword, newPassword } = JSON.parse(event.body);
    
    // Get the current user
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

    const user = result.Item;
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'set',
      ExpressionAttributeValues: {},
      ReturnValues: 'ALL_NEW'
    };

    // Update name if provided
    if (name !== undefined) {
      updateParams.UpdateExpression += ' #name = :name, ';
      updateParams.ExpressionAttributeNames = { '#name': 'name' };
      updateParams.ExpressionAttributeValues[':name'] = name;
    }

    // Update email if provided
    if (email !== undefined && email !== user.email) {
      // Check if new email is already taken
      const existingUser = await dynamoDb.query({
        TableName: USERS_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email }
      }).promise();

      if (existingUser.Items && existingUser.Items.length > 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Email already in use' })
        };
      }

      updateParams.UpdateExpression += ' email = :email, ';
      updateParams.ExpressionAttributeValues[':email'] = email;
    }

    // Update password if current and new passwords are provided
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Current password is incorrect' })
        };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateParams.UpdateExpression += ' password = :password, ';
      updateParams.ExpressionAttributeValues[':password'] = hashedPassword;
    }

    // Add updatedAt timestamp
    updateParams.UpdateExpression += ' updatedAt = :updatedAt';
    updateParams.ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Remove trailing comma if no fields were updated except updatedAt
    updateParams.UpdateExpression = updateParams.UpdateExpression.replace(',  ', ' ');

    const updatedUser = await dynamoDb.update(updateParams).promise();

    // Don't send password back
    const { password, ...userWithoutPassword } = updatedUser.Attributes;
    
    return {
      statusCode: 200,
      body: JSON.stringify(userWithoutPassword)
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
