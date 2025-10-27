terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration is handled by the deployment script
  # which creates a temporary backend.tf file
}

# Configure the AWS Provider
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = local.common_tags
  }
}

# Naming Module
module "naming" {
  source = "./library/naming"

  project_name     = var.project_name
  environment      = var.environment
  aws_region_short = var.aws_region_short
  default_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# Local variables
locals {
  # Common tags for all resources
  common_tags = merge(
    module.naming.tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  )

  # Resource names using the naming module
  resource_names = {
    frontend_bucket   = module.naming.s3_bucket_name
    cognito_user_pool = module.naming.cognito_user_pool_name
    cognito_domain    = var.cognito_domain != "" ? var.cognito_domain : "${var.project_name}-${var.environment}-auth"
    dynamodb_table    = module.naming.dynamodb_table_name
    api_gateway       = module.naming.api_gateway_name
  }

  # Auth configuration
  auth_config = {
    callback_urls = concat(
      ["http://localhost:3000/*"],
      var.domain_name != "" ? ["https://${var.domain_name}/*"] : []
    )
    logout_urls = concat(
      ["http://localhost:3000/"],
      var.domain_name != "" ? ["https://${var.domain_name}/"] : []
    )
  }

  # Frontend configuration
  frontend_config = {
    domain_name = var.domain_name != "" ? var.domain_name : ""
    bucket_name = local.resource_names.frontend_bucket
  }
}

# Networking Module
module "networking" {
  source       = "./modules/networking"
  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags
}

# Auth Module
module "auth" {
  source         = "./modules/auth"
  project_name   = var.project_name
  environment    = var.environment
  region         = var.aws_region
  common_tags    = local.common_tags
  cognito_domain = local.resource_names.cognito_domain
  callback_urls  = var.cognito_callback_urls
  logout_urls    = var.cognito_logout_urls
  
  # Enable TOTP MFA (Authenticator App)
  enable_mfa       = true
  mfa_configuration = "OPTIONAL"

  # Password policy
  password_policy = {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
  # Email configuration
  email_configuration = {
    email_sending_account  = "COGNITO_DEFAULT"
    from_email_address     = "no-reply@listspace.ph"
    reply_to_email_address = "no-reply@listspace.ph"
  }
}

# Database Module
module "database" {
  source       = "./modules/database"
  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags
}

# Frontend Module
module "frontend" {
  source       = "./modules/frontend"
  project_name = var.project_name
  bucket_name  = local.resource_names.frontend_bucket
  domain_name  = local.frontend_config.domain_name
  common_tags = merge(local.common_tags, {
    Environment = var.environment
  })

  # CloudFront settings
  cloudfront_price_class = "PriceClass_100"
  min_ttl                = 0
  default_ttl            = 300
  max_ttl                = 86400
}
