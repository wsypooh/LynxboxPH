# Basic Configuration
project_name     = "lynxbox-ph"
environment      = "prod"
aws_region       = "ap-southeast-1"
aws_region_short = "apse1"

# Domain Configuration
domain_name = "lynxbox.ph"

# SSL Certificate Configuration
ssl_certificate_arn = "arn:aws:acm:us-east-1:676805078590:certificate/3a8be6e4-837b-4d5c-baca-3c98af1bab8d"

# API Configuration
api_stage_name = "prod"

# Cognito Configuration
cognito_domain        = "lynxbox-ph-prod-auth" # Must be unique across all AWS accounts
cognito_callback_urls = ["http://localhost:3000/*", "https://lynxbox.ph/*"]
cognito_logout_urls   = ["http://localhost:3000/", "https://lynxbox.ph/"]

