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

# Signup Route (No Authentication)
resource "aws_apigatewayv2_route" "signup" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/signup"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# OPTIONS route for signup endpoint
resource "aws_apigatewayv2_route" "options_signup" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/signup"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Building Routes
resource "aws_apigatewayv2_route" "list_buildings" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/buildings"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "create_building" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/buildings"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_building" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/buildings/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_building" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/buildings/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_building" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/buildings/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_building_tenants" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/buildings/{id}/tenants"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Tenant Routes
resource "aws_apigatewayv2_route" "list_tenants" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/tenants"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "create_tenant" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/tenants"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_tenant" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/tenants/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_tenant" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/tenants/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_tenant" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/tenants/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_tenant_invoices" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/tenants/{id}/invoices"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Invoice Routes
resource "aws_apigatewayv2_route" "list_invoices" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/invoices"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "create_invoice" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_invoice" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/invoices/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_invoice" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/invoices/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_invoice" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/invoices/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_invoice_pdf" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/invoices/{id}/pdf"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invoice_batch_pdf" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices/batch-pdf"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invoice_batch_pdf_get" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/invoices/batch-pdf"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invoice_payment" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices/{id}/payments"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invoice_send" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices/{id}/send"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invoice_rollover" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices/{id}/rollover"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
