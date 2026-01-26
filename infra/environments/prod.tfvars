# Basic Configuration
project_name     = "lynxbox-ph"
environment      = "prod"
aws_region       = "ap-southeast-1"
aws_region_short = "apse1"

# Domain Configuration
domain_name = ""

# API Configuration
api_stage_name = "prod"

# Cognito Configuration
cognito_domain        = "lynxbox-ph-prod-auth" # Must be unique across all AWS accounts
cognito_callback_urls = ["http://localhost:3000/*", "https://your-domain.com/*"]
cognito_logout_urls   = ["http://localhost:3000/", "https://your-domain.com/"]

