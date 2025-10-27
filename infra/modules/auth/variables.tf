variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "cognito_domain" {
  description = "Cognito domain prefix (must be unique across all AWS accounts)"
  type        = string
  default     = ""
}

variable "enable_mfa" {
  description = "Whether to enable TOTP MFA (authenticator app) for the user pool"
  type        = bool
  default     = false
}

variable "mfa_configuration" {
  description = "The MFA configuration. Valid values: 'OFF', 'ON', or 'OPTIONAL'"
  type        = string
  default     = "OFF"
  
  validation {
    condition     = contains(["OFF", "ON", "OPTIONAL"], var.mfa_configuration)
    error_message = "The mfa_configuration must be one of: 'OFF', 'ON', or 'OPTIONAL'."
  }
}

variable "callback_urls" {
  description = "List of allowed callback URLs for the authentication flow"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://localhost:3000/"]
}

variable "logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000/", "https://localhost:3000/"]
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# Password policy configuration
variable "password_policy" {
  description = "Password policy configuration"
  type = object({
    minimum_length                   = number
    require_lowercase                = bool
    require_uppercase                = bool
    require_numbers                  = bool
    require_symbols                  = bool
    temporary_password_validity_days = number
  })
  default = {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
}

# Schema attributes for user pool

# Email configuration
variable "email_configuration" {
  description = "Email configuration for Cognito"
  type = object({
    email_sending_account  = string
    from_email_address     = string
    reply_to_email_address = string
  })
  default = {
    email_sending_account  = "COGNITO_DEFAULT"
    from_email_address     = "no-reply@listspace.ph"
    reply_to_email_address = "no-reply@listspace.ph"
  }
}
