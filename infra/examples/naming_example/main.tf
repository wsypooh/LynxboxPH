# Example usage of the AWS naming module

module "naming" {
  source = "../../library/naming"

  project_name     = "lynxbox-ph"
  environment      = "dev"
  aws_region_short = "apse1" # ap-southeast-1

  default_tags = {
    Environment = "dev"
    Project     = "lynxbox-ph"
    ManagedBy   = "Terraform"
    Owner       = "lynxbox-team"
    CostCenter  = "lynxbox"
  }
}

# Output example names for key AWS resources
output "vpc_name" {
  value = module.naming.vpc_name
}

output "public_subnet_names" {
  value = module.naming.public_subnet_names
}

output "private_subnet_names" {
  value = module.naming.private_subnet_names
}

output "security_group_name" {
  value = module.naming.security_group_name
}

output "lambda_function_name" {
  value = module.naming.lambda_function_name
}

output "api_gateway_name" {
  value = module.naming.api_gateway_name
}

output "s3_bucket_name" {
  value = module.naming.s3_bucket_name
}

output "dynamodb_table_name" {
  value = module.naming.dynamodb_table_name
}

output "cloudfront_distribution_name" {
  value = module.naming.cloudfront_distribution_name
}

output "cognito_user_pool_name" {
  value = module.naming.cognito_user_pool_name
}

output "cognito_user_pool_client_name" {
  value = module.naming.cognito_user_pool_client_name
}

output "iam_role_name" {
  value = module.naming.iam_role_name
}

output "cloudwatch_log_group_name" {
  value = module.naming.cloudwatch_log_group_name
}

# Output all generated names
output "all_names" {
  value = module.naming.names
}

# Output tags
output "tags" {
  value = module.naming.tags
}
