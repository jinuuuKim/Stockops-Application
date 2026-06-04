#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-.}"
ARTIFACT_DIR="${ARTIFACT_DIR:-${ROOT_DIR}/dist/artifacts/dev}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${ARTIFACT_DIR}/${STAMP}"

API_DIR="${API_DIR:-${WORKSPACE_DIR}/stockops-api-server}"
ADMIN_DIR="${ADMIN_DIR:-${WORKSPACE_DIR}/stockops-admin-web}"
SENSIMUL_DIR="${SENSIMUL_DIR:-${WORKSPACE_DIR}/Sensimul}"
CLIENT_DIR="${CLIENT_DIR:-${WORKSPACE_DIR}/stockops-client-web}"

API_IMAGE_URI="${API_IMAGE_URI:-}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
SKIP_ADMIN_BUILD="${SKIP_ADMIN_BUILD:-false}"

mkdir -p "${OUT_DIR}/api" "${OUT_DIR}/admin-web" "${OUT_DIR}/sensimul" "${OUT_DIR}/client-web"

require_dir() {
  local path="$1"
  local label="$2"

  if [[ ! -d "${path}" ]]; then
    echo "Missing ${label} directory: ${path}" >&2
    exit 1
  fi
}

require_dir "${API_DIR}" "stockops-api-server"
require_dir "${ADMIN_DIR}" "stockops-admin-web"
require_dir "${SENSIMUL_DIR}" "Sensimul"
require_dir "${CLIENT_DIR}" "stockops-client-web"

echo "Packaging StockOps dev artifacts into: ${OUT_DIR}"

echo "Packaging API Elastic Beanstalk Docker source bundle..."
(
  cd "${API_DIR}"
  zip -qr "${OUT_DIR}/api/stockops-api-server-eb-source.zip" \
    Dockerfile \
    pom.xml \
    src \
    .ebextensions \
    README.md \
    DEPLOYMENT_HANDOFF.md \
    -x "target/*" ".git/*" "*.DS_Store"
)

if [[ -n "${API_IMAGE_URI}" ]]; then
  echo "Packaging API Dockerrun bundle for image: ${API_IMAGE_URI}"
  cat > "${OUT_DIR}/api/Dockerrun.aws.json" <<JSON
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${API_IMAGE_URI}",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 8080
    }
  ]
}
JSON
  (
    cd "${OUT_DIR}/api"
    zip -q stockops-api-server-dockerrun.zip Dockerrun.aws.json
  )
fi

echo "Building and packaging admin web..."
if [[ "${SKIP_ADMIN_BUILD}" != "true" ]]; then
  (
    cd "${ADMIN_DIR}"
    if [[ ! -d node_modules ]]; then
      npm ci
    fi

    if [[ -n "${VITE_API_BASE_URL}" ]]; then
      VITE_API_BASE_URL="${VITE_API_BASE_URL}" npm run build
    else
      npm run build
    fi
  )
fi

if [[ -d "${ADMIN_DIR}/dist" ]]; then
  (
    cd "${ADMIN_DIR}/dist"
    zip -qr "${OUT_DIR}/admin-web/stockops-admin-web-static.zip" .
  )
else
  echo "Admin dist directory not found. Re-run without SKIP_ADMIN_BUILD=true or build admin web manually." >&2
fi

echo "Packaging Sensimul Docker source bundle..."
(
  cd "${SENSIMUL_DIR}"
  zip -qr "${OUT_DIR}/sensimul/sensimul-docker-source.zip" \
    Dockerfile \
    go.mod \
    go.sum \
    cmd \
    internal \
    config \
    README.md \
    Makefile \
    docker-compose.yml \
    .env.example \
    -x ".git/*" "data/*" "*.DS_Store"
)

echo "Packaging client web placeholder..."
if [[ -f "${CLIENT_DIR}/package.json" ]]; then
  (
    cd "${CLIENT_DIR}"
    if [[ ! -d node_modules ]]; then
      npm ci
    fi
    npm run build
    cd dist
    zip -qr "${OUT_DIR}/client-web/stockops-client-web-static.zip" .
  )
else
  (
    cd "${CLIENT_DIR}"
    zip -qr "${OUT_DIR}/client-web/stockops-client-web-placeholder.zip" README.md -x ".git/*" "*.DS_Store"
  )
fi

cat > "${OUT_DIR}/manifest.json" <<JSON
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "dev",
  "workspace_dir": "${WORKSPACE_DIR}",
  "artifacts": {
    "api_eb_source": "api/stockops-api-server-eb-source.zip",
    "api_dockerrun": "api/stockops-api-server-dockerrun.zip",
    "admin_static": "admin-web/stockops-admin-web-static.zip",
    "sensimul_source": "sensimul/sensimul-docker-source.zip",
    "client_placeholder": "client-web/stockops-client-web-placeholder.zip"
  }
}
JSON

ln -sfn "${OUT_DIR}" "${ARTIFACT_DIR}/latest"

echo
echo "Done."
echo "Artifact directory: ${OUT_DIR}"
echo "Latest symlink: ${ARTIFACT_DIR}/latest"
