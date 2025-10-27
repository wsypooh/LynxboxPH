# Basic Configuration
project_name     = "listspace-ph"
environment      = "dev"
aws_region       = "ap-southeast-1"
aws_region_short = "apse1"

# Domain Configuration
domain_name = ""

# API Configuration
api_stage_name = "dev"

# Cognito Configuration
cognito_domain        = "listspace-ph-dev-auth" # Must be unique across all AWS accounts
cognito_callback_urls = ["http://localhost:3000/*", "https://your-domain.com/*"]
cognito_logout_urls   = ["http://localhost:3000/", "https://your-domain.com/"]


