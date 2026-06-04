#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
API_DIR="${API_DIR:-${WORKSPACE_DIR:-.}/stockops-api-server}"
API_ECR_REPOSITORY_URL="${API_ECR_REPOSITORY_URL:-${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/stockops-dev-api}"
IMAGE_TAG="${IMAGE_TAG:-dev}"
PLATFORM="${PLATFORM:-linux/amd64}"

echo "Logging in to ECR: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building API image from ${API_DIR}"
docker build --platform "${PLATFORM}" -t "${API_ECR_REPOSITORY_URL}:${IMAGE_TAG}" "${API_DIR}"

echo "Pushing ${API_ECR_REPOSITORY_URL}:${IMAGE_TAG}"
docker push "${API_ECR_REPOSITORY_URL}:${IMAGE_TAG}"

echo
echo "Pushed API image:"
echo "${API_ECR_REPOSITORY_URL}:${IMAGE_TAG}"
