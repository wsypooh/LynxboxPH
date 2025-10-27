output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "dynamodb_policy_arn" {
  description = "ARN of the IAM policy for DynamoDB access"
  value       = aws_iam_policy.dynamodb_access.arn
}
