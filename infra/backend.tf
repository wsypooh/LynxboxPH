terraform {
  backend "s3" {
    bucket  = "listspace-ph-terraform-state"
    key     = "terraform.tfstate"
    region  = "ap-southeast-1"
    encrypt = true

    # Use lock file for state locking
    use_lockfile = true

  }
}

# Use workspace name as environment if not explicitly set
locals {
  environment = lower(coalesce(var.environment, terraform.workspace, "default"))
}
