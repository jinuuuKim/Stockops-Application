#!/usr/bin/env bash
set -euo pipefail

# Bootstrap S3 bucket and DynamoDB table for Terraform remote state.
# Run once before the first `terraform init` in the dev environment.

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
STATE_BUCKET="stockops-terraform-state-${ACCOUNT_ID}"
LOCK_TABLE="stockops-terraform-lock"

echo "Creating S3 bucket: ${STATE_BUCKET}"
if aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
  echo "Bucket already exists."
else
  aws s3api create-bucket \
    --bucket "${STATE_BUCKET}" \
    --region "${AWS_REGION}" \
    --create-bucket-configuration LocationConstraint="${AWS_REGION}"

  aws s3api put-bucket-versioning \
    --bucket "${STATE_BUCKET}" \
    --versioning-configuration Status=Enabled

  aws s3api put-public-access-block \
    --bucket "${STATE_BUCKET}" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "Bucket created with versioning and public access blocked."
fi

echo "Creating DynamoDB table: ${LOCK_TABLE}"
if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "Table already exists."
else
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${AWS_REGION}"

  echo "Table created."
fi

echo
echo "Remote state bootstrap complete."
echo "Update terraform/environments/dev/versions.tf backend block with:"
echo "  bucket         = \"${STATE_BUCKET}\""
echo "  key            = \"environments/dev/terraform.tfstate\""
echo "  region         = \"${AWS_REGION}\""
echo "  dynamodb_table = \"${LOCK_TABLE}\""
echo "  encrypt        = true"
