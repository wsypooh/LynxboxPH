# Naming convention module for ListSpace PH AWS resources

locals {
  # Standardized prefixes for AWS resources
  prefixes = {
    # Core Infrastructure
    vpc              = "vpc"
    subnet           = "snet"
    route_table      = "rt"
    internet_gateway = "igw"
    nat_gateway      = "nat"

    # Networking
    security_group = "sg"
    network_acl    = "nacl"
    endpoint       = "ep"

    # Compute
    lambda      = "lambda"
    api_gateway = "api"

    # Storage
    s3_bucket      = "s3"
    dynamodb_table = "ddb"

    # Security
    iam_role   = "role"
    iam_policy = "policy"

    # Monitoring
    cloudwatch_log   = "log"
    cloudwatch_alarm = "alarm"

    # CDN & DNS
    cloudfront     = "cf"
    route53_zone   = "zone"
    route53_record = "record"

    # Authentication
    cognito_user_pool = "cup"
    cognito_client    = "cognito"

    # Application Integration
    sns_topic = "sns"
    sqs_queue = "sqs"

    # Management & Governance
    cloudformation = "cfn"

    # Developer Tools
    codebuild    = "build"
    codepipeline = "pipeline"

    # Security, Identity, & Compliance
    secrets_manager = "secret"
    kms_key         = "kms"
  }

  # Generate resource names based on convention: {prefix}-{project}-{env}-{suffix?}
  resource_names = {
    for k, v in local.prefixes : k => {
      name = lower(
        format(
          "%s-%s-%s-%s",
          local.prefixes[k],
          replace(var.project_name, "_", "-"),
          var.environment,
          var.aws_region_short
        )
      )
      tags = merge(
        var.default_tags,
        {
          Environment = var.environment
          Project     = var.project_name
          ManagedBy   = "Terraform"
          Owner       = var.owner
          CostCenter  = var.cost_center
        }
      )
    }
  }

  # Special naming for resources that need custom formats or additional suffixes
  special_names = {
    # S3 bucket names must be globally unique and follow DNS naming conventions
    s3_bucket = {
      name = lower("${local.prefixes["s3_bucket"]}-${replace(var.project_name, "_", "-")}-${var.environment}-${var.aws_region_short}-${random_id.bucket_suffix.hex}")
      tags = local.resource_names["s3_bucket"].tags
    }

    # CloudFront distribution names are more readable with a different format
    cloudfront_distribution = {
      name = "${replace(var.project_name, "_", "-")}-${var.environment}-cdn"
      tags = local.resource_names["cloudfront"].tags
    }

    # Cognito user pool client names should be more descriptive
    cognito_user_pool_client = {
      name = "${replace(var.project_name, "_", "-")}-${var.environment}-client"
      tags = local.resource_names["cognito_client"].tags
    }
  }

  # Combine standard and special names
  all_names = merge(local.resource_names, local.special_names)
}

# Random string for S3 bucket name suffix to ensure global uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Output all the generated names
output "names" {
  value = local.all_names
}

# Individual outputs for commonly used resources
output "vpc_name" {
  value = local.all_names["vpc"].name
}

output "public_subnet_names" {
  value = [
    for i in range(2) :
    "${local.all_names["subnet"].name}-public-${i + 1}"
  ]
}

output "private_subnet_names" {
  value = [
    for i in range(2) :
    "${local.all_names["subnet"].name}-private-${i + 1}"
  ]
}

output "security_group_name" {
  value = local.all_names["security_group"].name
}

output "lambda_function_name" {
  value = local.all_names["lambda"].name
}

output "api_gateway_name" {
  value = local.all_names["api_gateway"].name
}

output "s3_bucket_name" {
  value = local.all_names["s3_bucket"].name
}

output "dynamodb_table_name" {
  value = local.all_names["dynamodb_table"].name
}

output "cloudfront_distribution_name" {
  value = local.all_names["cloudfront_distribution"].name
}

output "cognito_user_pool_name" {
  value = local.all_names["cognito_user_pool"].name
}

output "cognito_user_pool_client_name" {
  value = local.all_names["cognito_user_pool_client"].name
}

output "iam_role_name" {
  value = local.all_names["iam_role"].name
}

output "cloudwatch_log_group_name" {
  value = local.all_names["cloudwatch_log"].name
}

# Output all tags
output "tags" {
  value = local.all_names["vpc"].tags # Using vpc as the base for tags
}
