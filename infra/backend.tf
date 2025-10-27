terraform {
  backend "s3" {
    bucket         = "listspace-ph-terraform-state"
    key            = "terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "listspace-ph-terraform-locks"
    encrypt        = true
  }
}

# Use workspace name as environment if not explicitly set
locals {
  environment = lower(coalesce(var.environment, terraform.workspace, "default"))
}
