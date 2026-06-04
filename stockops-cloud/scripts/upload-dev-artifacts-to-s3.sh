#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="${ARTIFACT_DIR:-${ROOT_DIR}/dist/artifacts/dev/latest}"
S3_BUCKET="${1:-${S3_BUCKET:-}}"
S3_PREFIX="${2:-${S3_PREFIX:-stockops/dev/artifacts}}"

if [[ -z "${S3_BUCKET}" ]]; then
  echo "Usage: $0 <s3-bucket> [s3-prefix]" >&2
  echo "Example: $0 stockops-dev-artifacts-xxxx stockops/dev/artifacts" >&2
  exit 1
fi

if [[ ! -d "${ARTIFACT_DIR}" ]]; then
  echo "Artifact directory not found: ${ARTIFACT_DIR}" >&2
  echo "Run scripts/package-dev-artifacts.sh first." >&2
  exit 1
fi

DEST="s3://${S3_BUCKET}/${S3_PREFIX%/}/$(basename "$(readlink "${ARTIFACT_DIR}" 2>/dev/null || echo "${ARTIFACT_DIR}")")"

echo "Uploading artifacts from ${ARTIFACT_DIR}"
echo "Destination: ${DEST}"

aws s3 cp "${ARTIFACT_DIR}" "${DEST}" --recursive

echo
echo "Uploaded:"
echo "${DEST}"
