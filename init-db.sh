#!/bin/bash

# Install AWS CLI if not already installed
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Initialize DynamoDB tables
echo "Initializing DynamoDB tables..."
docker-compose exec -T dynamodb aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name UsersTable \
    --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=email,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH \
    --global-secondary-indexes "IndexName=EmailIndex,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1}" \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --region us-east-1 || echo "Table may already exist"

docker-compose exec -T dynamodb aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name ItemsTable \
    --attribute-definitions AttributeName=itemId,AttributeType=S AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=itemId,KeyType=HASH \
    --global-secondary-indexes "IndexName=UserIndex,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1}" \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --region us-east-1 || echo "Table may already exist"

echo "DynamoDB tables initialized successfully!"

echo "Restarting backend to apply changes..."
docker-compose restart api
