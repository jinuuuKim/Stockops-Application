terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    # S3 remote state backend for StockOps dev environment.
    # Bucket and DynamoDB table must be created before first `terraform init`.
    # Use scripts/bootstrap-remote-state.sh to create the bucket and lock table.
    #
    # bucket         = "stockops-terraform-state-<account-id>"
    # key            = "environments/dev/terraform.tfstate"
    # region         = "ap-northeast-2"
    # dynamodb_table = "stockops-terraform-lock"
    # encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
