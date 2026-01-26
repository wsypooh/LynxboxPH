variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "bucket_name" {
  description = "Name of the S3 bucket for the frontend"
  type        = string
}

variable "domain_name" {
  description = "Optional domain name for the frontend. If not provided, CloudFront distribution will be used directly."
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate to use for CloudFront distribution"
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "The price class for the CloudFront distribution"
  type        = string
  default     = "PriceClass_100"
}

variable "min_ttl" {
  description = "Minimum TTL for CloudFront cache"
  type        = number
  default     = 0
}

variable "default_ttl" {
  description = "Default TTL for CloudFront cache"
  type        = number
  default     = 3600
}

variable "max_ttl" {
  description = "Maximum TTL for CloudFront cache"
  type        = number
  default     = 86400
}

# Only try to get the Route 53 zone if a domain name is provided AND use_route53 is true
variable "use_route53" {
  description = "Whether to use Route 53 for DNS management. Set to false if using external DNS like Cloudflare."
  type        = bool
  default     = false
}

data "aws_route53_zone" "main" {
  count        = var.domain_name != "" && var.use_route53 ? 1 : 0
  name         = var.domain_name
  private_zone = false
}
