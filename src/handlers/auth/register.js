const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
};

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

module.exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Validate request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { email, password, name } = requestBody;
    
    // Validate required fields
    if (!email || !password) {
      return createResponse(400, { 
        error: 'Email and password are required',
        received: { email: !!email, password: !!password }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createResponse(400, { error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return createResponse(400, { 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if user exists
    const existingUser = await dynamoDb.query({
      TableName: USERS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }).promise();

    if (existingUser.Items && existingUser.Items.length > 0) {
      return createResponse(400, { 
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const newUser = {
      userId,
      email: email.toLowerCase().trim(),
      name: (name || '').trim(),
      password: hashedPassword,
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: true
    };

    await dynamoDb.put({
      TableName: USERS_TABLE,
      Item: newUser,
      ConditionExpression: 'attribute_not_exists(email)'
    }).promise();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId, 
        email: newUser.email,
        name: newUser.name
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Don't send sensitive data back
    const { password: _, ...userWithoutPassword } = newUser;
    
    return createResponse(201, { 
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword, 
      token,
      expiresIn: 86400 // 24 hours in seconds
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific DynamoDB errors
    if (error.code === 'ConditionalCheckFailedException') {
      return createResponse(400, { 
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }
    
    return createResponse(500, { 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};
