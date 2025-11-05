const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

module.exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);
    
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Find user by email
    const result = await dynamoDb.query({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    const user = result.Items[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ user: userWithoutPassword, token })
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
