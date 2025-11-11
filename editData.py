import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('ItemsTable')

def lambda_handler(event, context):
    try:
        # Parse the request body
        if isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event['body']
            
        item_id = body.get('id')
        updates = body.get('updates', {})
        
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
        
        # Prepare update expression and attribute values
        update_expression = 'SET '
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        for key, value in updates.items():
            # Handle reserved keywords by prefixing with '#'
            expr_key = f"#{key}"
            value_key = f":{key}"
            
            update_expression += f"{expr_key} = {value_key}, "
            expression_attribute_names[expr_key] = key
            expression_attribute_values[value_key] = value
        
        # Remove trailing comma and space
        update_expression = update_expression.rstrip(', ')
        
        # Update the item in DynamoDB
        response = table.update_item(
            Key={'id': item_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
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
                'data': response.get('Attributes', {})
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