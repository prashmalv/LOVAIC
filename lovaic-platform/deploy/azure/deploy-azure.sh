#!/usr/bin/env bash
#
# Deploy the LOVAIC Vision Intelligence Platform to Azure Container Apps.
# Everything lives in one resource group named "rlai-lovaic".
#
# Images are built IN THE CLOUD via `az acr build` — you do NOT need Docker locally.
#
# Prereqs (one-time):
#   az login
#   az account set --subscription "<your-subscription>"
#
# Run:
#   cd lovaic-platform
#   ./deploy/azure/deploy-azure.sh
#
# Override any default via env vars, e.g.:
#   LOCATION=eastus ACR_NAME=rlailovaic123 ./deploy/azure/deploy-azure.sh
set -euo pipefail

# ---- config (all overridable) ------------------------------------------------
RG="${RG:-rlai-lovaic}"
LOCATION="${LOCATION:-centralindia}"
ACR_NAME="${ACR_NAME:-rlailovaic}"          # must be globally unique, 5-50 alphanumeric
ENV_NAME="${ENV_NAME:-rlai-lovaic-env}"
APP_API="${APP_API:-rlai-lovaic-api}"
APP_WEB="${APP_WEB:-rlai-lovaic-web}"
TAG="${TAG:-latest}"

# repo root = two levels up from this script
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "▶ Resource group : $RG  (region: $LOCATION)"
echo "▶ Container reg.  : $ACR_NAME"
echo "▶ Apps           : $APP_API (backend) + $APP_WEB (frontend)"
echo

# ---- prerequisites -----------------------------------------------------------
echo "▶ Ensuring Azure CLI extensions & providers…"
az extension add --name containerapp --upgrade --only-show-errors 1>/dev/null
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerRegistry --wait

# ---- resource group + registry ----------------------------------------------
echo "▶ Creating resource group…"
az group create -n "$RG" -l "$LOCATION" --only-show-errors 1>/dev/null

echo "▶ Creating Azure Container Registry ($ACR_NAME)…"
az acr create -n "$ACR_NAME" -g "$RG" --sku Basic --admin-enabled true \
  --only-show-errors 1>/dev/null
ACR_SERVER="$(az acr show -n "$ACR_NAME" -g "$RG" --query loginServer -o tsv)"

# ---- build backend image in the cloud ---------------------------------------
echo "▶ Building backend image in ACR (cloud build)…"
az acr build -r "$ACR_NAME" -t "lovaic-backend:$TAG" "$ROOT/backend" --only-show-errors

# ---- Container Apps environment ---------------------------------------------
echo "▶ Creating Container Apps environment…"
az containerapp env create -n "$ENV_NAME" -g "$RG" -l "$LOCATION" \
  --only-show-errors 1>/dev/null

# ---- deploy backend ----------------------------------------------------------
# Single replica kept warm: detection model + in-memory footfall/track state.
echo "▶ Deploying backend container app…"
az containerapp create -n "$APP_API" -g "$RG" --environment "$ENV_NAME" \
  --image "$ACR_SERVER/lovaic-backend:$TAG" \
  --registry-server "$ACR_SERVER" \
  --target-port 8000 --ingress external \
  --cpu 2 --memory 4Gi --min-replicas 1 --max-replicas 1 \
  --only-show-errors 1>/dev/null 2>&1 \
  || az containerapp update -n "$APP_API" -g "$RG" \
       --image "$ACR_SERVER/lovaic-backend:$TAG" --only-show-errors 1>/dev/null

API_FQDN="$(az containerapp show -n "$APP_API" -g "$RG" \
  --query properties.configuration.ingress.fqdn -o tsv)"
API_URL="https://$API_FQDN"
echo "  backend live at: $API_URL"

# ---- build frontend image (API URL baked in at build time) ------------------
echo "▶ Building frontend image in ACR with API base = $API_URL …"
az acr build -r "$ACR_NAME" -t "lovaic-frontend:$TAG" \
  --build-arg "NEXT_PUBLIC_API_BASE=$API_URL" \
  "$ROOT/frontend" --only-show-errors

# ---- deploy frontend ---------------------------------------------------------
echo "▶ Deploying frontend container app…"
az containerapp create -n "$APP_WEB" -g "$RG" --environment "$ENV_NAME" \
  --image "$ACR_SERVER/lovaic-frontend:$TAG" \
  --registry-server "$ACR_SERVER" \
  --target-port 3000 --ingress external \
  --cpu 1 --memory 2Gi --min-replicas 1 --max-replicas 2 \
  --only-show-errors 1>/dev/null 2>&1 \
  || az containerapp update -n "$APP_WEB" -g "$RG" \
       --image "$ACR_SERVER/lovaic-frontend:$TAG" --only-show-errors 1>/dev/null

WEB_FQDN="$(az containerapp show -n "$APP_WEB" -g "$RG" \
  --query properties.configuration.ingress.fqdn -o tsv)"

echo
echo "════════════════════════════════════════════════════════════════"
echo "✅ LOVAIC is live on Azure"
echo "   App  : https://$WEB_FQDN"
echo "   API  : $API_URL"
echo "   RG   : $RG   (delete everything: az group delete -n $RG)"
echo "════════════════════════════════════════════════════════════════"
