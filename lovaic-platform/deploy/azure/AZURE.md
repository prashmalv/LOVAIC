# Deploy LOVAIC to Azure (run it from anywhere)

One script provisions everything in a resource group named **`rlai-lovaic`** using
**Azure Container Apps** + **Azure Container Registry**. Images are built **in the cloud**
(`az acr build`) — you don't need Docker installed locally.

## What you get

| Resource | Name | Purpose |
|----------|------|---------|
| Resource group | `rlai-lovaic` | holds everything |
| Container registry | `rlailovaic` | stores the two images |
| Container Apps env | `rlai-lovaic-env` | shared runtime |
| Backend app | `rlai-lovaic-api` | FastAPI + vision engine, public URL |
| Frontend app | `rlai-lovaic-web` | Next.js UI, public URL |

Public URLs look like `https://rlai-lovaic-web.<region>.azurecontainerapps.io`.

## Steps

```bash
# 1. one-time
az login
az account set --subscription "<your-subscription>"

# 2. deploy (from the lovaic-platform/ folder)
./deploy/azure/deploy-azure.sh
```

The script prints the live **App** and **API** URLs at the end. First boot downloads the
detection weights (~15 MB) inside the backend, so the very first request takes a few
seconds; after that it's warm.

## Customising

Everything is overridable via env vars:

```bash
LOCATION=eastus \
ACR_NAME=rlailovaic$RANDOM \        # if the default registry name is taken globally
./deploy/azure/deploy-azure.sh
```

## Re-deploying after code changes

Just run the script again — it rebuilds both images in ACR and updates the running apps
(the `create` calls fall back to `update`).

## Notes / production hardening

- **Backend runs as a single warm replica** (`--min-replicas 1 --max-replicas 1`): the
  footfall counters, per-camera trackers and live wall stats are kept in memory. To scale
  out, move that state to Redis and raise `--max-replicas`.
- **CPU inference.** The apps use CPU (2 vCPU / 4 GiB backend). Fine for a demo and a few
  live feeds. For a large camera wall or many concurrent users, deploy the backend to a
  **GPU** target (e.g. an AKS GPU node pool or a GPU VM) and load `yolov8s/m` weights.
- **CORS** is open (`*`) for the demo — lock `allow_origins` to your web URL in
  `backend/main.py` for production.
- **MJPEG streams** work through Container Apps ingress (continuous data keeps the
  connection alive). Very long idle gaps can be trimmed by the platform; the feeds stream
  continuously so this isn't hit in normal use.
- **Cost:** Container Apps bills for usage; a single warm backend replica is the main
  cost. Tear everything down with `az group delete -n rlai-lovaic`.

## Alternative targets

The same two images work on any container host — Azure Web App for Containers, AKS, or
plain `docker compose` (see the main README). Container Apps is the lowest-friction option
for a public demo URL.
