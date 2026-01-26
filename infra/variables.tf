# Global Variables
variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "lynxbox-ph"
}

variable "environment" {
  description = "The environment (e.g., dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "aws_access_key" {
  description = "AWS access key"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_region_short" {
  description = "Short name of the AWS region (e.g., 'ap-southeast-1' -> 'apse1')"
  type        = string
  default     = "apse1"
}

variable "aws_account_id" {
  description = "AWS account ID (12-digit number)"
  type        = string
  default     = ""
}

# Domain Configuration
variable "domain_name" {
  description = "Base domain name for the application (e.g., example.com)"
  type        = string
}

# Frontend Configuration
variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend assets"
  type        = string
  default     = "" # Will be generated if not provided
}

# API Configuration
variable "api_stage_name" {
  description = "Name of the API Gateway stage"
  type        = string
  default     = "v1"
}

# Authentication Configuration
variable "cognito_user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
  default     = "" # Will be generated if not provided
}

variable "cognito_domain" {
  description = "Domain prefix for Cognito hosted UI (must be unique across all AWS accounts)"
  type        = string
  default     = ""
}

variable "cognito_callback_urls" {
  description = "List of allowed callback URLs for the authentication flow"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://localhost:3000/"]
}

variable "cognito_logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://localhost:3000/"]
}

variable "lambda_runtime" {
  description = "Runtime for Lambda functions"
  type        = string
  default     = "nodejs24.x"
}

# Database Configuration
variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "" # Will be generated if not provided
}

# Tags
variable "default_tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = ""
    Project     = ""
    ManagedBy   = "Terraform"
  }
}

# Feature Flags
variable "enable_cloudfront" {
  description = "Enable CloudFront distribution for the frontend"
  type        = bool
  default     = true
}

variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable detailed logging for resources"
  type        = bool
  default     = true
}

# Resource Sizes
# Alarms and Monitoring
variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Email address for receiving CloudWatch alarm notifications"
  type        = string
  default     = ""
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

# Auto Scaling
variable "enable_auto_scaling" {
  description = "Enable auto scaling for applicable resources"
  type        = bool
  default     = true
}

# Backup Configuration
variable "enable_backups" {
  description = "Enable backup for resources"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Security
variable "allowed_cidr_blocks" {
  description = "List of allowed CIDR blocks for security groups"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Cost Allocation
variable "cost_center" {
  description = "Cost center for resource tagging"
  type        = string
  default     = ""
}

variable "owner" {
  description = "Owner for resource tagging"
  type        = string
  default     = ""
}
