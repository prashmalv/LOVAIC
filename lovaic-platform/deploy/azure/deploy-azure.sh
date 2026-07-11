#!/usr/bin/env bash
#
# Deploy the LOVAIC Vision Intelligence Platform to Azure Container Apps.
# Everything lives in one resource group named "rlai-lovaic".
#
# Images are built IN THE CLOUD via `az acr build` (default: straight from the
# GitHub repo, cloned server-side) — you do NOT need Docker locally.
#
# Prereqs (one-time):
#   az login
#
# Run:
#   cd lovaic-platform
#   ./deploy/azure/deploy-azure.sh
#
# Override any default via env vars, e.g.:
#   SUBSCRIPTION=<id> LOCATION=eastus ACR_NAME=rlailovaic123 ./deploy/azure/deploy-azure.sh
#   FORCE_BUILD=1 ./deploy/azure/deploy-azure.sh        # rebuild images even if present
#   BUILD_FROM=local ./deploy/azure/deploy-azure.sh     # upload local folders instead of git
set -euo pipefail

# ---- config (all overridable) ------------------------------------------------
# Pin the subscription so the CLI's active-subscription can't drift mid-deploy.
SUBSCRIPTION="${SUBSCRIPTION:-51d0cc8e-68e0-4876-9cc1-e8f546084cf4}"
RG="${RG:-rlai-lovaic}"
LOCATION="${LOCATION:-centralindia}"
ACR_NAME="${ACR_NAME:-rlailovaic}"          # must be globally unique, 5-50 alphanumeric
ENV_NAME="${ENV_NAME:-rlai-lovaic-env}"
APP_API="${APP_API:-rlai-lovaic-api}"
APP_WEB="${APP_WEB:-rlai-lovaic-web}"
TAG="${TAG:-latest}"

BUILD_FROM="${BUILD_FROM:-git}"             # git | local
REPO="${REPO:-https://github.com/prashmalv/LOVAIC.git}"
BRANCH="${BRANCH:-main}"
SUBDIR="${SUBDIR:-lovaic-platform}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Every subscription-scoped call goes through azx so the sub is always explicit.
azx() { az "$@" --subscription "$SUBSCRIPTION"; }

echo "▶ Subscription   : $SUBSCRIPTION"
echo "▶ Resource group : $RG  (region: $LOCATION)"
echo "▶ Container reg.  : $ACR_NAME"
echo "▶ Apps           : $APP_API (backend) + $APP_WEB (frontend)"
echo

# ---- prerequisites -----------------------------------------------------------
echo "▶ Ensuring Azure CLI extension & providers…"
az extension add --name containerapp --upgrade --only-show-errors 1>/dev/null
azx provider register --namespace Microsoft.App --wait 1>/dev/null
azx provider register --namespace Microsoft.OperationalInsights --wait 1>/dev/null
azx provider register --namespace Microsoft.ContainerRegistry --wait 1>/dev/null

# ---- resource group + registry ----------------------------------------------
echo "▶ Resource group…"
azx group create -n "$RG" -l "$LOCATION" --only-show-errors 1>/dev/null

echo "▶ Container registry…"
azx acr create -n "$ACR_NAME" -g "$RG" --sku Basic --admin-enabled true --only-show-errors 1>/dev/null
ACR_SERVER="$(azx acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)"
ACR_USER="$(azx acr credential show -n "$ACR_NAME" --query username -o tsv)"
ACR_PASS="$(azx acr credential show -n "$ACR_NAME" --query 'passwords[0].value' -o tsv)"

# ---- build source ------------------------------------------------------------
if [ "$BUILD_FROM" = "git" ]; then
  BACKEND_CTX="$REPO#$BRANCH:$SUBDIR/backend"
  FRONTEND_CTX="$REPO#$BRANCH:$SUBDIR/frontend"
  echo "▶ Build source: git → $REPO ($BRANCH)"
else
  BACKEND_CTX="$ROOT/backend"; FRONTEND_CTX="$ROOT/frontend"
  echo "▶ Build source: local folders"
fi

have_image() {
  [ "${FORCE_BUILD:-0}" != "1" ] && \
    azx acr repository show-tags -n "$ACR_NAME" --repository "$1" -o tsv 2>/dev/null | grep -qx "$TAG"
}

# ---- backend image + app -----------------------------------------------------
if have_image lovaic-backend; then
  echo "▶ Backend image lovaic-backend:$TAG already in ACR — skipping build (FORCE_BUILD=1 to rebuild)"
else
  echo "▶ Building backend image in ACR…"
  azx acr build -r "$ACR_NAME" -t "lovaic-backend:$TAG" "$BACKEND_CTX" --only-show-errors
fi

echo "▶ Container Apps environment…"
azx containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" --only-show-errors 1>/dev/null 2>&1 || true
until [ "$(azx containerapp env show -n "$ENV_NAME" -g "$RG" --query properties.provisioningState -o tsv 2>/dev/null)" = "Succeeded" ]; do
  echo "  …waiting for environment to be ready"; sleep 10
done

deploy_app() {
  local name="$1" image="$2" port="$3" cpu="$4" mem="$5" minr="$6" maxr="$7"
  if azx containerapp show -n "$name" -g "$RG" >/dev/null 2>&1; then
    echo "  ↳ updating $name"
    azx containerapp update -n "$name" -g "$RG" --image "$image" \
      --min-replicas "$minr" --max-replicas "$maxr" --only-show-errors 1>/dev/null
  else
    echo "  ↳ creating $name"
    azx containerapp create -n "$name" -g "$RG" --environment "$ENV_NAME" \
      --image "$image" \
      --registry-server "$ACR_SERVER" --registry-username "$ACR_USER" --registry-password "$ACR_PASS" \
      --target-port "$port" --ingress external \
      --cpu "$cpu" --memory "$mem" --min-replicas "$minr" --max-replicas "$maxr" \
      --only-show-errors 1>/dev/null
  fi
}

echo "▶ Deploying backend…"
deploy_app "$APP_API" "$ACR_SERVER/lovaic-backend:$TAG" 8000 2 4Gi 1 1
API_FQDN="$(azx containerapp show -n "$APP_API" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
API_URL="https://$API_FQDN"
echo "  backend live at: $API_URL"

# ---- frontend image + app (API URL baked in) --------------------------------
echo "▶ Building frontend image in ACR with API base = $API_URL …"
azx acr build -r "$ACR_NAME" -t "lovaic-frontend:$TAG" \
  --build-arg "NEXT_PUBLIC_API_BASE=$API_URL" "$FRONTEND_CTX" --only-show-errors

echo "▶ Deploying frontend…"
deploy_app "$APP_WEB" "$ACR_SERVER/lovaic-frontend:$TAG" 3000 1 2Gi 1 2
WEB_FQDN="$(azx containerapp show -n "$APP_WEB" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"

echo
echo "════════════════════════════════════════════════════════════════"
echo "✅ LOVAIC is live on Azure"
echo "   App  : https://$WEB_FQDN"
echo "   API  : $API_URL"
echo "   Sub  : $SUBSCRIPTION"
echo "   RG   : $RG   (delete everything: az group delete -n $RG --subscription $SUBSCRIPTION)"
echo "════════════════════════════════════════════════════════════════"
