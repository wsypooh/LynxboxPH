# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 access policy for CSV operations
resource "aws_iam_role_policy" "lambda_s3_csv" {
  name = "${var.project_name}-lambda-s3-csv-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${var.s3_bucket_arn}",
          "${var.s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.function_name}-${var.environment}"
  handler       = var.handler
  runtime       = var.runtime
  role          = aws_iam_role.lambda_exec.arn
  timeout       = var.timeout
  memory_size   = var.memory_size

  filename         = var.filename
  source_code_hash = filebase64sha256(var.filename)

  environment {
    variables = merge(
      var.environment_variables,
      {
        ENVIRONMENT = var.environment
        REGION      = var.region
      }
    )
  }

  tags = var.common_tags
}

# API Gateway integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"

  connection_type    = "INTERNET"
  description        = "Lambda ${var.function_name}"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.api.invoke_arn
}

# API Gateway route
resource "aws_apigatewayv2_route" "lambda" {
  api_id    = var.api_gateway_id
  route_key = var.route_key
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  # Only require authorization for non-public routes
  authorization_type = var.is_public ? "NONE" : "JWT"
  authorizer_id      = var.is_public ? null : var.authorizer_id
}

# Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
