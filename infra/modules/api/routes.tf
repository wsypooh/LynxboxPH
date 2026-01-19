# Property routes
resource "aws_apigatewayv2_route" "create_property" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "POST /api/properties"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_property" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "GET /api/properties/{id}"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_property" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "PUT /api/properties/{id}"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_property" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "DELETE /api/properties/{id}"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_properties" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "GET /api/properties"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

# Unified search and filter properties route
resource "aws_apigatewayv2_route" "search_properties" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "GET /api/properties/search"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

# OPTIONS route for CORS preflight requests
resource "aws_apigatewayv2_route" "options_properties" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# OPTIONS route for unified search endpoint
resource "aws_apigatewayv2_route" "options_search" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties/search"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Image upload route
resource "aws_apigatewayv2_route" "upload_image" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "POST /api/properties/{id}/images"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

# Image upload URL route
resource "aws_apigatewayv2_route" "get_upload_url" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "GET /api/properties/{id}/images/upload-url"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

# Image view URL route
resource "aws_apigatewayv2_route" "get_view_url" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "GET /api/properties/{id}/images/view-url"
  target            = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id     = aws_apigatewayv2_authorizer.cognito.id
}

# OPTIONS routes for image endpoints
resource "aws_apigatewayv2_route" "options_images" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties/{id}/images"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Public Property Routes (No Authentication)
resource "aws_apigatewayv2_route" "list_public_properties" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/properties"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get_public_property" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/properties/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "search_public_properties" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/search"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Public Property Image View URL Route (No Authentication)
resource "aws_apigatewayv2_route" "get_public_view_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/properties/{id}/images/view-url"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# OPTIONS routes for public endpoints
resource "aws_apigatewayv2_route" "options_public_properties" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/public/properties"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "options_public_search" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/public/search"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "options_upload_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties/{id}/images/upload-url"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "options_view_url" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties/{id}/images/view-url"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
