output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.frontend.arn
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudflare_cname_instruction" {
  description = "Instructions for Cloudflare CNAME configuration"
  value       = var.use_route53 ? "Using Route 53 for DNS management" : "Create a CNAME record in Cloudflare pointing '${var.domain_name}' to '${aws_cloudfront_distribution.frontend.domain_name}'"
}
