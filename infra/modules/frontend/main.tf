terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket        = var.bucket_name
  force_destroy = true

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-frontend"
    }
  )
}

# S3 static website configuration (separate resource per provider v5)
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_versioning" "frontend_versioning" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_encryption" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "CloudFront OAI for ${var.project_name} frontend"
}

# Allow CloudFront Origin Access Identity to read from the S3 bucket
resource "aws_s3_bucket_policy" "frontend_oai_read" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "AllowCloudFrontOAIRead",
        Effect = "Allow",
        Principal = {
          CanonicalUser = aws_cloudfront_origin_access_identity.frontend.s3_canonical_user_id
        },
        Action = [
          "s3:GetObject"
        ],
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# CloudFront Function: rewrite extensionless URLs to .html
# Next.js static export produces /foo.html — this lets visitors use /foo.
resource "aws_cloudfront_function" "url_rewrite" {
  provider = aws.us_east_1
  name     = "${var.project_name}-${var.environment}-url-rewrite"
  runtime  = "cloudfront-js-2.0"
  publish  = true

  code = <<-JS
    async function handler(event) {
      const request = event.request;
      const uri = request.uri;

      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else if (!uri.includes('.')) {
        request.uri = uri + '.html';
      }

      return request;
    }
  JS
}

# Security headers, including CSP, added at the CDN layer since the static
# export (S3 origin, no server) has nothing else that can set them.
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-${var.environment}-security-headers"
  comment = "CSP + baseline security headers for the static frontend"

  security_headers_config {
    content_security_policy {
      override = true
      # script-src/style-src need 'unsafe-inline': Next.js's own App Router static
      # export embeds RSC hydration payloads as inline <script>self.__next_f.push(...)
      # tags (content differs every build, so hashing them isn't practical, and this
      # static export has no server to mint a per-request nonce) -- the GA bootstrap
      # script was moved to /gtag-init.js, but that alone wasn't enough to drop
      # 'unsafe-inline'; blocking it left the page blank since React can't hydrate.
      # Chakra/Emotion's runtime-injected <style> tags have the same nonce limitation.
      content_security_policy = join("; ", [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.s3.${var.aws_region}.amazonaws.com https://*.s3.amazonaws.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.execute-api.${var.aws_region}.amazonaws.com https://cognito-idp.${var.aws_region}.amazonaws.com https://cognito-identity.${var.aws_region}.amazonaws.com https://*.s3.${var.aws_region}.amazonaws.com https://*.s3.amazonaws.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ])
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} frontend distribution"
  default_root_object = "index.html"

  # Add custom domain aliases
  aliases = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-${var.bucket_name}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"
    compress         = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                    = var.min_ttl
    default_ttl                = var.default_ttl
    max_ttl                    = var.max_ttl
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  price_class = var.cloudfront_price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.ssl_certificate_arn != "" ? var.ssl_certificate_arn : null
    cloudfront_default_certificate = var.domain_name == "" || var.ssl_certificate_arn == ""
    minimum_protocol_version       = "TLSv1.2_2021"
    ssl_support_method             = "sni-only"
  }

  dynamic "custom_error_response" {
    for_each = [403, 404]
    content {
      error_caching_min_ttl = 300
      error_code            = custom_error_response.value
      response_code         = 200
      response_page_path    = "/realtor.html"
    }
  }
}
# ACM Certificate for custom domain
resource "aws_acm_certificate" "cert" {
  count = var.domain_name != "" && var.ssl_certificate_arn == "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route 53 validation records for ACM certificate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.ssl_certificate_arn == "" && var.use_route53 ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# ACM Certificate Validation
resource "aws_acm_certificate_validation" "cert" {
  count = var.domain_name != "" && var.ssl_certificate_arn == "" && var.use_route53 ? 1 : 0

  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Only create Route 53 record if domain_name is provided AND use_route53 is true
resource "aws_route53_record" "frontend" {
  count = var.domain_name != "" && var.use_route53 ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# Output the CloudFront domain name
# Outputs have been moved to outputs.tf for better organization
