# Basic Configuration
project_name     = "lynxbox-ph"
environment      = "dev"
aws_region       = "ap-southeast-1"
aws_region_short = "apse1"

# Domain Configuration
domain_name = "sandbox.lynxbox.ph"

# SSL Certificate Configuration
ssl_certificate_arn = "arn:aws:acm:us-east-1:676805078590:certificate/3a8be6e4-837b-4d5c-baca-3c98af1bab8d"

# API Configuration
api_stage_name = "dev"

# Cognito Configuration
cognito_domain        = "lynxbox-ph-dev-auth" # Must be unique across all AWS accounts
cognito_callback_urls = ["http://localhost:3000/*", "https://sandbox.lynxbox.ph/*"]
cognito_logout_urls   = ["http://localhost:3000/", "https://sandbox.lynxbox.ph/"]

# ZeptoMail Configuration (Development)
# Get these from your ZeptoMail account at https://zeptomail.com/
zeptomail_api_key              = ""  # Add your ZeptoMail API key here (SMTP)
zeptomail_template_api_key    = ""  # Add your ZeptoMail template API key here
zeptomail_template_key        = ""  # Add your welcome email template key here
zeptomail_sender_email        = "noreply@lynxbox.ph"
zeptomail_sender_name         = "Lynxbox PH"
zeptomail_bcc_email           = "hello@lynxbox.ph"


