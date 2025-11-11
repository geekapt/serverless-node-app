# Serverless Dashboard Application

This is a three-tier serverless application built with React, AWS Lambda, and DynamoDB. The application provides a dashboard interface for managing items with full CRUD operations.

## Architecture Overview

<img width="1157" height="729" alt="image" src="https://github.com/user-attachments/assets/fde4b6f7-c59a-41a3-a193-2ec059b366b9" />


## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured with credentials
3. Node.js and npm installed
4. Python 3.8+ for Lambda functions
5. AWS SAM CLI (for local testing)

## Complete Deployment Guide

### 1. IAM Roles and Policies

#### Lambda Execution Role
```bash
# Create role
aws iam create-role \
  --role-name LambdaDynamoDBAccessRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Service": ["lambda.amazonaws.com", "apigateway.amazonaws.com"]
      },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name LambdaDynamoDBAccessRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
  --role-name LambdaDynamoDBAccessRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Add S3 read permissions for Lambda
aws iam put-role-policy \
  --role-name LambdaDynamoDBAccessRole \
  --policy-name S3ReadAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME/*",
        "arn:aws:s3:::YOUR_BUCKET_NAME"
      ]
    }]
  }'
```

### 2. DynamoDB Table

```bash
# Create table with GSI for querying
aws dynamodb create-table \
  --table-name ItemsTable \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[
      {
        "IndexName": "CreatedAtIndex",
        "KeySchema": [
          {"AttributeName": "created_at", "KeyType": "HASH"}
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-2
```

### 3. Lambda Functions Setup

#### Required Lambda Functions:
1. `CreateItemFunction` - Handles POST /items
2. `GetItemsFunction` - Handles GET /items
3. `GetItemFunction` - Handles GET /items/{id}
4. `UpdateItemFunction` - Handles PUT /items/{id}
5. `DeleteItemFunction` - Handles DELETE /items/{id}
6. `ProcessUploadFunction` - Triggered by S3 upload events

#### Deployment Example (repeat for each function):

```bash
# Create deployment package
mkdir -p lambda_functions/process_upload
cd lambda_functions/process_upload

# Create requirements.txt
echo "boto3>=1.26.0" > requirements.txt

# Install dependencies
pip install -r requirements.txt -t .

# Create Lambda function (example: process_upload.py)
cat > process_upload.py << 'EOL'
import boto3
import json

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    
    # Process each record in the S3 event
    for record in event['Records']:
        # Get the bucket name and key
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        # Get the object
        response = s3.get_object(Bucket=bucket, Key=key)
        file_content = response['Body'].read().decode('utf-8')
        
        # Process the file content
        # ... your processing logic here ...
        
        print(f"Processed file {key} from bucket {bucket}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }
EOL

# Create deployment package
zip -r ../process_upload.zip .

# Deploy the function
aws lambda create-function \
  --function-name ProcessUploadFunction \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaDynamoDBAccessRole \
  --handler process_upload.lambda_handler \
  --zip-file fileb://lambda_functions/process_upload.zip \
  --environment "Variables={TABLE_NAME=ItemsTable}" \
  --region us-east-2

# Add S3 trigger
aws lambda add-permission \
  --function-name ProcessUploadFunction \
  --principal s3.amazonaws.com \
  --statement-id s3-trigger \
  --action "lambda:InvokeFunction" \
  --source-arn arn:aws:s3:::YOUR_BUCKET_NAME \
  --source-account YOUR_ACCOUNT_ID
```

### 4. API Gateway Setup

#### Create REST API
```bash
# Create API
API_ID=$(aws apigateway create-rest-api \
  --name 'DashboardAPI' \
  --description 'Dashboard API for CRUD operations' \
  --region us-east-2 \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[0].id' \
  --output text)

# Create items resource
ITEMS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part 'items' \
  --query 'id' \
  --output text)

# Create item by ID resource
ITEM_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ITEMS_RESOURCE_ID \
  --path-part '{id}' \
  --query 'id' \
  --output text)
```

#### Configure CORS
```bash
# Enable CORS for /items
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $ITEMS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}'

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ITEMS_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
  --passthrough-behavior WHEN_NO_MATCH

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $ITEMS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin": "'\''*'\''", "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,OPTIONS'\''", "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''"}'
```

### 5. S3 Static Website Hosting

#### Create S3 Bucket
```bash
# Create bucket (must be globally unique)
BUCKET_NAME="your-unique-bucket-name-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-2

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME/ \
  --index-document index.html \
  --error-document index.html

# Create bucket policy
cat > bucket-policy.json << EOL
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::$BUCKET_NAME/*"]
    }
  ]
}
EOL

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json

# Enable CORS
cat > cors-config.json << EOL
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
}
EOL

aws s3api put-bucket-cors \
  --bucket $BUCKET_NAME \
  --cors-configuration file://cors-config.json
```

#### Build and Deploy Frontend
```bash
# Build React app
cd dashboard-app/frontend
npm install
npm run build

# Upload to S3
aws s3 sync build/ s3://$BUCKET_NAME/ --delete

# Set cache control (1 year for static assets, no cache for HTML)
aws s3 cp s3://$BUCKET_NAME/ s3://$BUCKET_NAME/ \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control max-age=31536000,public

# Update HTML files to have no cache
aws s3 cp s3://$BUCKET_NAME/index.html s3://$BUCKET_NAME/index.html \
  --metadata-directive REPLACE \
  --cache-control no-cache,no-store,must-revalidate \
  --content-type "text/html"

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-us-east-2.amazonaws.com"
echo "Website URL: $WEBSITE_URL"
```

### 6. CloudFront Distribution (Optional but Recommended)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name $BUCKET_NAME.s3.amazonaws.com \
  --default-root-object index.html \
  --default-cache-behavior '{
    "TargetOriginId": "S3-$BUCKET_NAME",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": { "Forward": "none" },
      "Headers": {
        "Quantity": 1,
        "Items": ["Origin"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }' \
  --enabled
```

### 7. Environment Configuration

Update your React app's environment variables (`.env` or `src/config.js`):

```javascript
// src/config.js
export const API_CONFIG = {
  BASE_URL: 'https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod',
  S3_BUCKET: 'YOUR_BUCKET_NAME',
  REGION: 'us-east-2',
  // Add other environment-specific settings
};
```

### 8. Testing the Deployment

1. **Test API Endpoints**:
   ```bash
   # Test GET /items
   curl https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod/items
   
   # Test POST /items
   curl -X POST https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod/items \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Item","description":"Test Description"}'
   ```

2. **Test S3 Uploads**:
   - Upload a file to your S3 bucket
   - Verify the Lambda function processes it by checking CloudWatch logs

3. **Test Frontend**:
   - Open the CloudFront or S3 website URL in a browser
   - Verify all CRUD operations work
   - Check console for any CORS or API errors

### 9. Cleanup

```bash
# Delete CloudFront distribution
# Note: You must disable the distribution first
aws cloudfront delete-distribution --id YOUR_DISTRIBUTION_ID --if-match ETAG

# Delete S3 bucket (must be empty first)
aws s3 rb s3://$BUCKET_NAME --force

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete Lambda functions
aws lambda delete-function --function-name ProcessUploadFunction
# Repeat for other functions...

# Delete DynamoDB table
aws dynamodb delete-table --table-name ItemsTable

# Delete IAM role
aws iam detach-role-policy --role-name LambdaDynamoDBAccessRole --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam detach-role-policy --role-name LambdaDynamoDBAccessRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role-policy --role-name LambdaDynamoDBAccessRole --policy-name S3ReadAccess
aws iam delete-role --role-name LambdaDynamoDBAccessRole
```

## Monitoring and Maintenance

1. **CloudWatch Alarms**:
   - Set up alarms for Lambda errors, throttling, and duration
   - Monitor DynamoDB read/write capacity

2. **Logging**:
   - All Lambda logs are available in CloudWatch Logs
   - API Gateway access logs can be enabled for detailed request tracking

3. **Backup**:
   - Enable point-in-time recovery for DynamoDB
   - Set up S3 versioning for important files

## Security Considerations

1. **Least Privilege**:
   - Use specific IAM policies instead of wildcard permissions
   - Restrict S3 bucket policies to specific IP ranges if possible

2. **Data Protection**:
   - Enable encryption at rest for S3 and DynamoDB
   - Use AWS KMS for managing encryption keys

3. **API Security**:
   - Enable API keys and usage plans
   - Consider using Amazon Cognito for user authentication
   - Implement request validation in API Gateway

## Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Verify CORS is enabled on both API Gateway and S3
   - Check that the `Access-Control-Allow-Origin` header is being set correctly

2. **Lambda Timeouts**:
   - Increase the timeout in Lambda configuration
   - Check for long-running operations or cold starts

3. **S3 Permissions**:
   - Verify bucket policies and CORS configuration
   - Check if the bucket is public and if it needs to be

4. **API Gateway 500 Errors**:
   - Check CloudWatch logs for the Lambda function
   - Verify the integration response is properly configured

## Next Steps

1. **CI/CD Pipeline**:
   - Set up AWS CodePipeline for automated deployments
   - Add testing stages to your pipeline

2. **Monitoring**:
   - Implement AWS X-Ray for distributed tracing
   - Set up CloudWatch dashboards for key metrics

3. **Scaling**:
   - Configure DynamoDB auto-scaling
   - Consider using API Gateway caching for read-heavy workloads

4. **Security**:
   - Implement WAF rules for your CloudFront distribution
   - Set up AWS Shield for DDoS protection

## License

This project is licensed under the MIT License.
