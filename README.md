# Serverless Dashboard Application

This is a three-tier serverless application built with React, AWS Lambda, and DynamoDB. The application provides a dashboard interface for managing items with full CRUD operations.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    API Gateway  │────▶│    Lambda       │
│  (React SPA)    │     │                 │     │    Functions    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │    DynamoDB     │
                                                │                 │
                                                └─────────────────┘
```

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured with credentials
3. Node.js and npm installed
4. Python 3.8+ for Lambda functions
5. AWS SAM CLI (for local testing)

## Deployment Steps

### 1. IAM Roles and Policies

Create an IAM role for Lambda functions with the following policies:

1. Create a new IAM role for Lambda:
   ```bash
   aws iam create-role \
     --role-name LambdaDynamoDBAccessRole \
     --assume-role-policy-document '{
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": {
           "Service": "lambda.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }]
     }'
   ```

2. Attach necessary policies:
   ```bash
   aws iam attach-role-policy \
     --role-name LambdaDynamoDBAccessRole \
     --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

   aws iam attach-role-policy \
     --role-name LambdaDynamoDBAccessRole \
     --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
   ```

### 2. DynamoDB Setup

Create a new DynamoDB table:

```bash
aws dynamodb create-table \
  --table-name ItemsTable \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-2
```

### 3. Lambda Functions

#### Create a deployment package for each Lambda function:

1. Create a directory for the Lambda function:
   ```bash
   mkdir -p lambda_functions/delete_item
   cd lambda_functions/delete_item
   ```

2. Create a `requirements.txt`:
   ```
   boto3>=1.26.0
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt -t .
   ```

4. Copy your Lambda function code (e.g., `deleteData.py`) into this directory.

5. Create a deployment package:
   ```bash
   zip -r ../delete_item.zip .
   ```

#### Deploy the Lambda function:

```bash
aws lambda create-function \
  --function-name DeleteItemFunction \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaDynamoDBAccessRole \
  --handler deleteData.lambda_handler \
  --zip-file fileb://lambda_functions/delete_item.zip \
  --region us-east-2
```

Repeat for other CRUD operations (Create, Read, Update).

### 4. API Gateway

1. Create a new REST API:
   ```bash
   aws apigateway create-rest-api \
     --name 'DashboardAPI' \
     --region us-east-2
   ```

2. Get the API ID and create a resource:
   ```bash
   # Get the API ID
   API_ID=$(aws apigateway get-rest-apis --query "items[?name=='DashboardAPI'].id" --output text)
   
   # Create a resource
   PARENT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)
   
   # Create a new resource (e.g., /items)
   RESOURCE_ID=$(aws apigateway create-resource \
     --rest-api-id $API_ID \
     --parent-id $PARENT_ID \
     --path-part items \
     --query 'id' \
     --output text)
   ```

3. Create a method (e.g., DELETE /items):
   ```bash
   aws apigateway put-method \
     --rest-api-id $API_ID \
     --resource-id $RESOURCE_ID \
     --http-method DELETE \
     --authorization-type NONE
   ```

4. Set up the integration with Lambda:
   ```bash
   aws apigateway put-integration \
     --rest-api-id $API_ID \
     --resource-id $RESOURCE_ID \
     --http-method DELETE \
     --type AWS_PROXY \
     --integration-http-method POST \
     --uri arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:YOUR_ACCOUNT_ID:function:DeleteItemFunction/invocations
   ```

5. Deploy the API:
   ```bash
   aws apigateway create-deployment \
     --rest-api-id $API_ID \
     --stage-name prod
   ```

### 5. Frontend Deployment (S3 + CloudFront)

1. Build the React application:
   ```bash
   cd dashboard-app/frontend
   npm install
   npm run build
   ```

2. Create an S3 bucket and enable static website hosting:
   ```bash
   aws s3 mb s3://your-bucket-name --region us-east-2
   aws s3 website s3://your-bucket-name/ --index-document index.html --error-document index.html
   ```

3. Upload the build files:
   ```bash
   aws s3 sync build/ s3://your-bucket-name/ --delete
   ```

4. Create a CloudFront distribution (via AWS Console):
   - Origin Domain: your-bucket-name.s3.us-east-2.amazonaws.com
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Default Root Object: index.html
   - Error Pages: 403 -> /index.html (200)

### 6. Environment Configuration

Update your frontend to use the deployed API endpoint. In `src/App.js`:

```javascript
const API_CONFIG = {
  BASE_URL: 'https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod/items',
  API_KEY: 'YOUR_API_KEY'  // If using API key authentication
};
```

## Monitoring and Logging

1. **CloudWatch Logs**: All Lambda function logs are automatically sent to CloudWatch.
2. **CloudWatch Alarms**: Set up alarms for errors and throttling.
3. **X-Ray**: Enable AWS X-Ray for end-to-end tracing.

## Clean Up

To avoid unnecessary charges, delete all resources when not in use:

```bash
# Delete Lambda functions
aws lambda delete-function --function-name DeleteItemFunction

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete DynamoDB table
aws dynamodb delete-table --table-name ItemsTable

# Empty and delete S3 bucket
aws s3 rm s3://your-bucket-name --recursive
aws s3 rb s3://your-bucket-name

# Delete IAM role
aws iam detach-role-policy --role-name LambdaDynamoDBAccessRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam detach-role-policy --role-name LambdaDynamoDBAccessRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name LambdaDynamoDBAccessRole
```

## Security Considerations

1. Enable CORS in API Gateway
2. Use API keys or Cognito for authentication
3. Implement proper input validation in Lambda functions
4. Use least privilege IAM roles
5. Enable AWS WAF for API protection

## Troubleshooting

- Check CloudWatch Logs for Lambda execution errors
- Verify IAM permissions if getting access denied errors
- Ensure CORS headers are properly set in API Gateway
- Check if DynamoDB table name matches in Lambda code

## License

This project is licensed under the MIT License.
