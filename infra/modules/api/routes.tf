# Property routes
resource "aws_apigatewayv2_route" "create_property" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/properties"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_property" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/properties/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "update_property" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /api/properties/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_property" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /api/properties/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_properties" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/properties"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
