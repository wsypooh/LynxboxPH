variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
  default     = "lynxbox-ph"
}

variable "aws_region" {
  description = "AWS region to create resources in"
  type        = string
  default     = "ap-southeast-1"
}
