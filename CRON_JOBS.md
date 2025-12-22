# Cloud Scheduler setup for cron jobs

Backend base URL: `https://expense-backend-87619496528.us-central1.run.app`

Auth header (required on every job):
- Name: `X-Cron-Token`
- Value: `<CRON_SECRET>` (set the same secret value in Cloud Run env and use it here; do not commit the actual secret)

Recommended timezone: `Asia/Kolkata` (for 2 PM local reminders). If you prefer UTC, use `UTC` consistently in Cloud Run env and Cloud Scheduler jobs.

Jobs (POST, no body):
| Job | URL | Cron (IST) | Purpose |
| --- | --- | --- | --- |
| renewal-reminders | `https://expense-backend-87619496528.us-central1.run.app/_cron/renewal-reminders` | `0 14 * * *` | 5-day renewal reminders |
| rejected-cleanup | `https://expense-backend-87619496528.us-central1.run.app/_cron/rejected-cleanup` | `0 2 * * *` | Auto-delete rejected entries |
| renewal-flag-reset | `https://expense-backend-87619496528.us-central1.run.app/_cron/renewal-flag-reset` | `0 3 * * *` | Reset renewal flags after cycle |
| exchange-refresh | `https://expense-backend-87619496528.us-central1.run.app/_cron/exchange-refresh` | `30 1 * * *` | Refresh FX rates and INR amounts |
| auto-cancel | `https://expense-backend-87619496528.us-central1.run.app/_cron/auto-cancel` | `0 10 * * *` | Pre-renewal auto-cancel notice |

Cloud Scheduler (console) per job:
- Target: HTTP
- Method: POST
- URL: as above
- Headers: `X-Cron-Token: <CRON_SECRET>`
- Auth: allow unauthenticated if using the header, or use OIDC with a service account that has Cloud Run Invoker
- Timezone: set to match your choice (e.g., Asia/Kolkata)
- Frequency: cron from the table

gcloud template (example: renewal-reminders; repeat for each with path/schedule):
```bash
REGION=us-central1
TIMEZONE="Asia/Kolkata"      # or UTC
BACKEND_URL="https://expense-backend-87619496528.us-central1.run.app"
CRON_SECRET="<CRON_SECRET>"  # same value as in Cloud Run env

gcloud scheduler jobs create http renewal-reminders \
  --location=$REGION \
  --schedule="0 14 * * *" \
  --time-zone="$TIMEZONE" \
  --uri="$BACKEND_URL/_cron/renewal-reminders" \
  --http-method=POST \
  --headers="X-Cron-Token:$CRON_SECRET" \
  --oidc-service-account-email=<SA_WITH_RUN_INVOKER>  # or omit if allowing unauthenticated
```

Notes:
- Keep `ENABLE_IN_APP_CRON=false` in Cloud Run when using Scheduler.
- Do not commit secrets; inject `CRON_SECRET` via Cloud Run env and paste the same value into the Scheduler header.


6-FkSUisvF_yzro1EoAu5NpHYKQzwu7BgoN0ppmidILPC2pKWNE_FpK0F0GB9lAI
6-FkSUisvF_yzro1EoAu5NpHYKQzwu7BgoN0ppmidILPC2pKWNE_FpK0F0GB9lAI