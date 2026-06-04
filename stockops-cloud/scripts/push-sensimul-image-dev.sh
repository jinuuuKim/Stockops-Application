#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
SENSIMUL_DIR="${SENSIMUL_DIR:-${WORKSPACE_DIR:-.}/Sensimul}"
SENSIMUL_ECR_REPOSITORY_URL="${SENSIMUL_ECR_REPOSITORY_URL:-${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/stockops-dev-sensimul}"
IMAGE_TAG="${IMAGE_TAG:-dev}"
PLATFORM="${PLATFORM:-linux/amd64}"

echo "Logging in to ECR: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Building Sensimul image from ${SENSIMUL_DIR}"
docker build --platform "${PLATFORM}" --build-arg APP_NAME=sensimul -t "${SENSIMUL_ECR_REPOSITORY_URL}:${IMAGE_TAG}" "${SENSIMUL_DIR}"

echo "Pushing ${SENSIMUL_ECR_REPOSITORY_URL}:${IMAGE_TAG}"
docker push "${SENSIMUL_ECR_REPOSITORY_URL}:${IMAGE_TAG}"

echo
echo "Pushed Sensimul image:"
echo "${SENSIMUL_ECR_REPOSITORY_URL}:${IMAGE_TAG}"
