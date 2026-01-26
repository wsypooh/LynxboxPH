variable "project_name" {
  description = "The name of the project (e.g., lynxbox-ph)"
  type        = string
  default     = "lynxbox-ph"
}

variable "environment" {
  description = "The deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region_short" {
  description = "The short code for AWS region (e.g., use1, apse1)"
  type        = string
  default     = "apse1" # ap-southeast-1
}

variable "default_tags" {
  description = "A map of default tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "owner" {
  description = "The owner/team responsible for the resource"
  type        = string
  default     = "lynxbox-team"
}

variable "cost_center" {
  description = "The cost center for billing purposes"
  type        = string
  default     = "lynxbox"
}
