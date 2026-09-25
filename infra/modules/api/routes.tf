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

# Image upload confirm route (post-upload watermark/resize processing step)
resource "aws_apigatewayv2_route" "confirm_image_upload" {
  api_id            = aws_apigatewayv2_api.main.id
  route_key         = "POST /api/properties/{id}/images/confirm"
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
resource "aws_apigatewayv2_route" "options_confirm_image_upload" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /api/properties/{id}/images/confirm"
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

# Public contact-reveal route (masked phone/email everywhere else; this hands out the real
# values one listing at a time so bulk list/search responses can't be scraped for them)
resource "aws_apigatewayv2_route" "get_public_contact_info" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/properties/{id}/contact"
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

resource "aws_apigatewayv2_route" "invoice_void" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/invoices/{id}/void"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Ledger Routes
resource "aws_apigatewayv2_route" "ledger_create_charge" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/ledger/charges"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "tenant_ledger" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/tenants/{id}/ledger"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "tenant_ledger_reset" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/tenants/{id}/ledger/reset"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "tenant_payment" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/tenants/{id}/payments"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Document Routes
resource "aws_apigatewayv2_route" "document_upload_url" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/documents/upload-url"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "create_document" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/documents"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_documents" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/documents"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "get_document_view_url" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/documents/{id}/view-url"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_document" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/documents/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "delete_document" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/documents/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Platform Admin Routes
resource "aws_apigatewayv2_route" "platform_admin_dashboard_summary" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/platform-admin/dashboard/summary"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_account_detail" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/platform-admin/accounts/{accountId}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_account_update_plan" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/platform-admin/accounts/{accountId}/plan"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Account / Member Routes
resource "aws_apigatewayv2_route" "account_me" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/account/me"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "account_memberships" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/account/memberships"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "list_account_members" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/account/members"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "invite_account_member" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/account/members"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "update_account_member" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/account/members/{sub}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "remove_account_member" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "DELETE /api/account/members/{sub}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# docs/Payments-and-Subscription-Plan.md — Billing
resource "aws_apigatewayv2_route" "billing_status" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/billing/status"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_usage" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/billing/usage"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_validate_promo_code" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/billing/promo-codes/validate"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_start_trial" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/billing/start-trial"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_downgrade_to_free" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/billing/downgrade-to-free"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_payment_submissions_upload_url" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/billing/payment-submissions/upload-url"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_create_payment_submission" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/billing/payment-submissions"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "billing_list_payment_submissions" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/billing/payment-submissions"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# docs/Payments-and-Subscription-Plan.md — Public promo codes (no authorizer)
resource "aws_apigatewayv2_route" "public_promo_active_auto_apply" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/public/promo-codes/active-auto-apply"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Contact Us / Support page (no authorizer)
resource "aws_apigatewayv2_route" "public_contact_submit" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/public/contact"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# docs/Payments-and-Subscription-Plan.md — Platform-admin payment verification
resource "aws_apigatewayv2_route" "platform_admin_list_payment_submissions" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/platform-admin/payment-submissions"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_view_payment_submission_proof" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/platform-admin/payment-submissions/{id}/view-url"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_approve_payment_submission" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/platform-admin/payment-submissions/{id}/approve"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_reject_payment_submission" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/platform-admin/payment-submissions/{id}/reject"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_extend_trial" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/platform-admin/accounts/{accountId}/extend-trial"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_list_promo_codes" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /api/platform-admin/promo-codes"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_create_promo_code" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "POST /api/platform-admin/promo-codes"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_update_promo_code" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/platform-admin/promo-codes/{code}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "platform_admin_deactivate_promo_code" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "PUT /api/platform-admin/promo-codes/{code}/deactivate"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
