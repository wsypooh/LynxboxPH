# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"

  # Enable CORS for all origins in development, restrict in production
  cors_configuration {
    allow_origins  = var.environment == "dev" ? ["*"] : ["https://${var.domain_name}"]
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers  = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    expose_headers = ["Content-Length"]
    max_age        = 300
  }

  tags = var.common_tags
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      path             = "$context.path"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/api-gw/${var.project_name}-${var.environment}"
  retention_in_days = 14
  tags              = var.common_tags
}

# API Gateway Authorizer
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito-authorizer-${var.environment}"

  jwt_configuration {
    audience = [var.cognito_user_pool_client_id]
    issuer   = "https://${var.cognito_user_pool_endpoint}"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda" {
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

  tags = var.common_tags
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Function
resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api-${var.environment}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # The deployment package will be uploaded separately
  filename         = "${path.module}/../../../../dist/api.zip"
  source_code_hash = fileexists("${path.module}/../../../../dist/api.zip") ? filebase64sha256("${path.module}/../../../../dist/api.zip") : null

  role    = aws_iam_role.lambda.arn
  timeout = 30

  environment {
    variables = {
      NODE_ENV       = var.environment
      DYNAMODB_TABLE = var.dynamodb_table_name
      USER_POOL_ID   = var.user_pool_id
      CLIENT_ID      = var.user_pool_client_id
      REGION         = var.aws_region
    }
  }

  tags = var.common_tags
}

# API Gateway Lambda Permission
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# API Gateway Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri    = aws_lambda_function.api.invoke_arn
  integration_method = "POST"
}

# API Gateway Route
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
