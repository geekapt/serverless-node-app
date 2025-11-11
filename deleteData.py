import json
import boto3

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('ItemsTable')

def lambda_handler(event, context):
    # Log the entire event to see its structure
    print("Received event:", json.dumps(event))

    try:
        # Check if 'body' is a stringified JSON and parse it if needed
        if isinstance(event['body'], str):
            body = json.loads(event['body'])  # Parse the stringified JSON body
        else:
            body = event['body']  # Use it directly if it's already an object
        
        # Log the parsed body to check the structure
        print("Parsed body:", body)

        # Extract the item_id
        item_id = body.get('id')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing item ID'
                })
            }
        
        # Delete the item from DynamoDB
        table.delete_item(
            Key={'id': item_id}
        )
        
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
                'message': 'Item deleted successfully'
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
