# Frontend Outputs
output "frontend_url" {
  description = "URL of the frontend application"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${module.frontend.cloudfront_domain_name}"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for the frontend"
  value       = module.frontend.s3_bucket_name
}

output "s3_objects_bucket_name" {
  description = "Name of the S3 bucket for objects/images"
  value       = module.s3.bucket_name
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = module.auth.user_pool_arn
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.auth.user_pool_client_id
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.auth.user_pool_domain
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = module.auth.identity_pool_id
}

# Database Outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.database.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = module.database.table_arn
}

# Frontend Configuration Output
output "frontend_config" {
  description = "Frontend configuration for environment variables"
  sensitive   = true
  value = {
    REACT_APP_REGION       = var.aws_region
    REACT_APP_USER_POOL_ID = module.auth.user_pool_id
    REACT_APP_CLIENT_ID    = module.auth.user_pool_client_id
    REACT_APP_DOMAIN       = module.auth.user_pool_domain
  }
}

# API Gateway Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.api.api_endpoint
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api.api_id
}

# Lambda Outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = module.api.lambda_function_name
}

output "lambda_execution_role_arn" {
  description = "ARN of the IAM role for Lambda"
  value       = module.api.lambda_role_arn
}

output "lambda_role_name" {
  description = "Name of the IAM role for Lambda"
  value       = module.api.lambda_role_name
}

# Complete AWS Config Output (for reference)
output "aws_config" {
  description = "Complete AWS configuration for the application"
  sensitive   = true
  value = {
    region              = var.aws_region
    userPoolId          = module.auth.user_pool_id
    userPoolWebClientId = module.auth.user_pool_client_id
    oauth = {
      domain          = "${module.auth.user_pool_domain}.auth.${var.aws_region}.amazoncognito.com"
      scope           = ["email", "openid", "profile"]
      redirectSignIn  = var.domain_name != "" ? "https://${var.domain_name}/" : "http://localhost:3000/"
      redirectSignOut = var.domain_name != "" ? "https://${var.domain_name}/" : "http://localhost:3000/"
      responseType    = "code"
    }
  }
}
