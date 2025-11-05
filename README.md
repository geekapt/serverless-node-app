# Serverless Node.js CRUD Application with Authentication

This is a serverless web application built with Node.js, Express, React, and AWS services including Lambda, API Gateway, DynamoDB, S3, and Cognito.

## Features

- User registration and authentication with JWT
- Protected API routes
- CRUD operations for items
- Serverless architecture
- Responsive frontend with React

## Prerequisites

- Node.js 14.x or later
- npm or yarn
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- AWS SAM CLI (for local testing)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file in the backend directory):
   ```
   USERS_TABLE=dev-UsersTable
   ITEMS_TABLE=dev-ItemsTable
   JWT_SECRET=your-secret-key
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Deployment

### Backend Deployment

1. Install AWS SAM CLI if you haven't already:
   ```bash
   pip install aws-sam-cli
   ```

2. Build the application:
   ```bash
   sam build
   ```

3. Deploy the application:
   ```bash
   sam deploy --guided
   ```
   Follow the prompts to provide the necessary parameters.

### Frontend Deployment

1. Build the frontend for production:
   ```bash
   cd frontend
   npm run build
   ```

2. Upload the contents of the `build` directory to your S3 bucket:
   ```bash
   aws s3 sync build/ s3://your-bucket-name --delete
   ```

## API Endpoints

- `POST /register` - Register a new user
- `POST /login` - User login
- `GET /profile` - Get user profile (protected)
- `GET /items` - Get all items for user (protected)
- `POST /items` - Create a new item (protected)
- `PUT /items/:id` - Update an item (protected)
- `DELETE /items/:id` - Delete an item (protected)

## Environment Variables

- `USERS_TABLE`: DynamoDB table name for users
- `ITEMS_TABLE`: DynamoDB table name for items
- `JWT_SECRET`: Secret key for JWT token generation

## License

This project is licensed under the MIT License.
