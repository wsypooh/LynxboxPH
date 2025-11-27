output "bucket_name" {
  description = "The name of the created S3 bucket"
  value       = aws_s3_bucket.images.id
}

output "bucket_arn" {
  description = "The ARN of the created S3 bucket"
  value       = aws_s3_bucket.images.arn
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket"
  value       = aws_s3_bucket.images.bucket_domain_name
}
