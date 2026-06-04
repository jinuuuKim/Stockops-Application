#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${WORKSPACE_DIR:-.}"
ADMIN_DIR="${ADMIN_DIR:-${WORKSPACE_DIR}/stockops-admin-web}"
S3_BUCKET="${1:-${S3_BUCKET:-}}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"

if [[ -z "${S3_BUCKET}" ]]; then
  echo "Usage: VITE_API_BASE_URL=http://api.example.com $0 <admin-web-bucket>" >&2
  exit 1
fi

if [[ -z "${VITE_API_BASE_URL}" ]]; then
  echo "VITE_API_BASE_URL is required." >&2
  exit 1
fi

cd "${ADMIN_DIR}"

if [[ ! -d node_modules ]]; then
  npm install --package-lock=false
fi

VITE_API_BASE_URL="${VITE_API_BASE_URL}" npx vite build
aws s3 sync dist "s3://${S3_BUCKET}" --delete

echo
echo "Admin web synced to s3://${S3_BUCKET}"
