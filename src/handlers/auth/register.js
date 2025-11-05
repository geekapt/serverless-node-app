const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

module.exports.handler = async (event) => {
  try {
    const { email, password, name } = JSON.parse(event.body);
    
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Check if user exists
    const existingUser = await dynamoDb.query({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }).promise();

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const newUser = {
      userId,
      email,
      name: name || '',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDb.put({
      TableName: USERS_TABLE,
      Item: newUser
    }).promise();

    // Generate JWT token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = newUser;
    
    return {
      statusCode: 201,
      body: JSON.stringify({ user: userWithoutPassword, token })
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
