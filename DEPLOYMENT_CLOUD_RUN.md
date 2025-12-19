# Google Cloud Run deployment (frontend + backend)

This repo is now wired for Google Cloud Run with CI/CD via GitHub Actions. Both the Node/Express API (`backend`) and Vite/React SPA (`frontend`) build into separate Docker images and deploy to individual Cloud Run services.

## Prerequisites
- Google Cloud project with billing enabled.
- APIs: `run.googleapis.com`, `artifactregistry.googleapis.com`, and (optional for secrets) `secretmanager.googleapis.com`.
- `gcloud` CLI locally (for one-time setup/verification).
- Domain/DNS optional if you want a custom URL.

## One-time GCP setup
1) **Create Artifact Registry repo** (Docker format, pick the same region you will deploy to):
   ```bash
   gcloud artifacts repositories create expense-app \
     --repository-format=docker \
     --location=YOUR_REGION
   ```
2) **Service account for CI/CD** (minimal roles):
   - `roles/run.admin`
   - `roles/iam.serviceAccountUser`
   - `roles/artifactregistry.writer`
   - `roles/logging.logWriter`
   - (optional) `roles/secretmanager.secretAccessor`
   Export a JSON key and keep it safe—this becomes the `GCP_SA_KEY` secret in GitHub.
3) **Enable Cloud Run to serve traffic**: nothing special; the workflow deploys with `--allow-unauthenticated` so the app is public. Remove that flag if you want private access + IAP.

## Required GitHub secrets/vars
Add these in **Settings → Secrets and variables → Actions**:

| Secret/Var | Purpose |
| --- | --- |
| `GCP_PROJECT_ID` | Your project id |
| `GCP_REGION` | Cloud Run/Artifact Registry region (e.g., `us-central1`) |
| `GCP_SA_KEY` | JSON key for the deployer service account |
| `BACKEND_MONGODB_URI` | Mongo connection string |
| `BACKEND_JWT_SECRET` | JWT signing secret |
| `BACKEND_JWT_EXPIRE` | Token TTL (e.g., `7d`) |
| `BACKEND_SUPER_ADMIN_SETUP_KEY` | One-time setup key |
| `BACKEND_EMAIL_HOST`/`BACKEND_EMAIL_PORT`/`BACKEND_EMAIL_USER`/`BACKEND_EMAIL_PASSWORD`/`BACKEND_EMAIL_FROM` | Email creds (matches `.env.example`) |
| `BACKEND_URL` | Public backend base URL for emails (use the Cloud Run URL or your custom domain) |
| `CURRENCY_API_KEY` / `CURRENCY_API_URL` | Currency conversion config |
| `FRONTEND_URL` | Public frontend URL (used in backend emails) |
| `RENEWAL_NOTIFICATION_DAYS` | e.g., `5` |
| `AUTO_DELETE_REJECTED_DAYS` | e.g., `3` |
| `AUTO_CANCEL_DAYS_BEFORE` | e.g., `2` |
| `CRON_SECRET` | Shared secret header for Cloud Scheduler → backend cron endpoints |
| `ENABLE_IN_APP_CRON` *(optional)* | Leave `false`; set `true` only if you must run cron inside the container |
| `CRON_TIMEZONE` *(optional)* | Timezone for in-app cron (default `UTC`); not needed if using Cloud Scheduler |
| `FRONTEND_API_URL` *(optional)* | Overrides API URL for the SPA build; otherwise the workflow uses the just-deployed backend URL |

> If you prefer Secret Manager instead of GitHub secrets, swap the `--env-vars-file` step in the workflow for `--set-secrets`.

## CI/CD workflow (already added)
Path: `.github/workflows/deploy-cloudrun.yml`

- Triggers on pushes to `main` or manual `workflow_dispatch`.
- **Backend job**
  - Builds `backend/Dockerfile` and pushes to Artifact Registry `expense-app/backend:${GITHUB_SHA}`.
  - Deploys Cloud Run service `expense-backend` (`--min-instances 1` to keep cron jobs alive).
  - Supplies env vars from GitHub secrets via an env file.
  - Captures the service URL as an output.
- **Frontend job**
  - Builds `frontend/Dockerfile` with `VITE_API_URL` pointing to the backend URL (or `FRONTEND_API_URL` secret override).
  - Pushes image `expense-app/frontend:${GITHUB_SHA}` and deploys Cloud Run service `expense-frontend`.
- Both services listen on port `8080` as required by Cloud Run.

## One-time manual verification (optional)
If you want to sanity-check before trusting CI:
```bash
# From repo root
docker build -t ${REGION}-docker.pkg.dev/${PROJECT}/expense-app/backend:local ./backend
docker build --build-arg VITE_API_URL=https://YOUR_BACKEND_URL/api \
  -t ${REGION}-docker.pkg.dev/${PROJECT}/expense-app/frontend:local ./frontend

gcloud run deploy expense-backend \
  --image ${REGION}-docker.pkg.dev/${PROJECT}/expense-app/backend:local \
  --region ${REGION} --platform managed --allow-unauthenticated --port 8080

gcloud run deploy expense-frontend \
  --image ${REGION}-docker.pkg.dev/${PROJECT}/expense-app/frontend:local \
  --region ${REGION} --platform managed --allow-unauthenticated --port 8080
```

## Environment files for local dev
- Backend: see `backend/.env.example` (PORT defaulted to 8080 for Cloud Run).
- Frontend: see `frontend/.env.example` (`VITE_API_URL=https://<backend>/api`).

## Notes & runtime considerations
- **Cron jobs**: Cloud Run scales to zero; keeping `--min-instances 1` ensures the in-process cron stays alive. For zero-scale, move jobs to Cloud Scheduler hitting dedicated endpoints.
- **Cloud Scheduler integration** (recommended):
  - Endpoints (POST) are exposed at `/_cron/renewal-reminders`, `/rejected-cleanup`, `/renewal-flag-reset`, `/exchange-refresh`, `/auto-cancel`.
  - Protect with the `X-Cron-Token` header using `CRON_SECRET` (or use OIDC/IAM if you secure the service).
  - Create Scheduler jobs per the cron expressions in code: `0 14 * * *`, `0 2 * * *`, `0 3 * * *`, `30 1 * * *`, `0 10 * * *` (adjust timezone as needed).
- **Uploads**: Container filesystem is ephemeral. If you need durable uploads, wire them to Cloud Storage and update the upload path.
- **Custom domains/SSL**: After first deploy, map a domain to each service in Cloud Run and update `BACKEND_URL`/`FRONTEND_URL` secrets accordingly.
- **Artifact Registry**: repo name is `expense-app`; change it in the workflow if you prefer a different name.
