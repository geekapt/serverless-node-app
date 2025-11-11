import uuid
import json
import boto3
import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('ItemsTable')  # Make sure this matches your table name

def lambda_handler(event, context):
    try:
        # Parse the request body
        if isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
        
        # Extract data from the request
        name = body.get('name')
        description = body.get('description')
        
        # Generate a unique ID for the item
        item_id = str(uuid.uuid4())

        # Create the item object
        item = {
            'id': item_id,
            'name': name,
            'description': description,
            'created_at': datetime.datetime.utcnow().isoformat()
        }

        # Insert into DynamoDB
        response = table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Item created successfully',
                'item': item
            })
        }

    except Exception as e:
        print('Error:', str(e))
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }