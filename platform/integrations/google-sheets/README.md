# Google Sheets data pipeline

Supabase is the source of truth. Google Sheets is a secondary operational copy for easy viewing, sharing, and manual analysis.

## Why this is dual-write instead of Sheets-only

- A Google Sheets outage or Apps Script error must never lose a questionnaire response.
- Supabase keeps normalized response/answer data and permissions.
- Every response is queued in `google_sheets_sync_queue` for retryable export.
- Google Sheets can be rebuilt from Supabase if necessary.

## Spreadsheet tabs

The managed spreadsheet uses these tabs:

1. `回答一覧` — one row per response.
2. `回答詳細` — one row per question answer.
3. `店舗・医院マスタ` — one row per store/clinic.
4. `イベント` — behavioral events. Phase 2 writes `response_submitted`; Phase 3 adds view/start/review CTA events.
5. `店舗タブ管理` — Survey IDと店舗専用タブIDの対応、状態、更新日時。

Each survey also receives a dedicated operational tab named `店舗・医院名 [slug]`. Responses are appended there as one row per submission while the normalized `回答一覧` and `回答詳細` tabs remain authoritative copies. New question IDs add columns without rewriting historical rows.

Survey lifecycle synchronization follows the admin state:

- create: create and register the dedicated tab
- rename/update: rename the tab and update the registry
- archive: prefix the tab with `削除済み_` and hide it without deleting responses
- restore: restore the current name and show the tab again

## Phase 1 — completed

- `google_sheets_sync_queue` is created.
- Every new response is automatically queued by a database trigger.
- Historical responses are backfilled into the queue.
- Queue writes remain server/database-only; staff can read status.
- `Code.gs` provides an idempotent Apps Script webhook receiver.

## Phase 2 — durable asynchronous response sync

The public response API now follows this order:

1. Validate the answer.
2. Save it to Supabase first.
3. Let the database trigger create a `pending` queue row.
4. Return HTTP 201 immediately. The response request never calls Apps Script.
5. A separate `questionnaire-google-sheets-sync` Scheduled Worker atomically claims at most one job every minute.
6. Rebuild the payload from the saved response, response answers, exact survey version, questions, options, config, and metadata.
7. POST it to Apps Script with a 20-second timeout, then mark it `synced` or schedule a retry.

This keeps Supabase authoritative and prevents a Sheets outage from losing questionnaire answers.

### Security

`GOOGLE_SHEETS_WEBHOOK_SECRET` is server-only and must never use a `NEXT_PUBLIC_` prefix.

Queue mutation RPCs are revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`. A five-minute lease and random `lock_token` prevent an expired Worker invocation from overwriting a newer attempt. Admin retry actions verify the normal session and `profile.role === admin` before creating a server-only service-role client.

### Google Apps Script one-time setup

Use the spreadsheet `アンケート回答データ管理`.

1. Open the spreadsheet and choose **Extensions → Apps Script**.
2. Replace the script with `platform/integrations/google-sheets/Code.gs`.
3. Save it and run the `setup()` function once. The script automatically stores the prepared spreadsheet ID and generates a random `WEBHOOK_SECRET`.
4. Open the execution log and copy the generated `WEBHOOK_SECRET`.
5. Choose **Deploy → New deployment → Web app**.
6. Execute as the script owner and allow access required for the deployed web app endpoint.
7. Copy the `/exec` deployment URL.
8. Opening the `/exec` URL in a browser should return JSON with `{"ok":true,"configured":true}`.

### Cloudflare runtime configuration

The response-serving `questionnaire` Worker no longer needs to call the webhook. Configure the separate Scheduled Worker with:

- non-secret `SUPABASE_URL` in `wrangler.google-sheets-sync.jsonc`
- secret `SUPABASE_SERVICE_ROLE_KEY`
- secret `GOOGLE_SHEETS_WEBHOOK_URL` (Apps Script `/exec` URL)
- secret `GOOGLE_SHEETS_WEBHOOK_SECRET`

The Worker runs once per minute with concurrency 1 and claims at most one job. Retry delays are 1, 2, 4, 8, 16, 32, 64, 128, 256, 360, and 360 minutes. Attempt 12 becomes `failed`. An administrator can retry one failed job or all failed jobs at `/admin/system/google-sheets`.

### Production rollout (run separately after approval)

1. Back up Production and apply `20260926120842_google_sheets_async_queue.sql`.
2. Deploy the updated Apps Script and verify its deployment URL without resending queue data.
3. Create the three Worker secrets with `wrangler secret put --config wrangler.google-sheets-sync.jsonc`.
4. Deploy `questionnaire-google-sheets-sync` and confirm the cron trigger.
5. Deploy the main application so new submissions return immediately and the Admin Queue UI becomes available.
6. Observe one new test response through `pending → processing → synced`.
7. Only after that smoke test, use the Admin Queue UI to retry the existing failed rows. Existing pending rows are consumed automatically.

### Rollback

Disable or delete only the Scheduled Worker's cron trigger first. Roll back the main application to the previous version if synchronous delivery must temporarily be restored. The additive columns/functions may remain safely in place; do not drop the queue or delete responses. Roll back Apps Script only after the Worker is stopped. Any `pending`/`failed` rows remain recoverable because Supabase is authoritative.

### Expected payload

```json
{
  "secret": "<shared secret>",
  "store": {
    "id": "uuid",
    "name": "店舗・医院名",
    "industry": "clinic",
    "slug": "example",
    "status": "published",
    "googleReviewUrl": "https://..."
  },
  "response": {
    "id": "uuid",
    "submittedAt": "2026-09-07T00:00:00Z",
    "surveyName": "お客様アンケート",
    "version": 3,
    "averageScore": 9.0,
    "totalScore": 18,
    "reviewEligible": true,
    "needsFollowUp": false
  },
  "answers": [
    {
      "questionId": "uuid",
      "questionTitle": "スタッフの対応はいかがでしたか？",
      "questionType": "rating_10",
      "value": 9,
      "score": 9
    }
  ],
  "events": [
    {
      "id": "<response-id>:response_submitted",
      "createdAt": "2026-09-07T00:00:00Z",
      "type": "response_submitted",
      "metadata": {}
    }
  ]
}
```

## Phase 3 — analytics

Add event collection for:

- survey view
- response start
- response complete
- review CTA shown
- review CTA clicked

Then surface store/clinic dashboards for response count, completion rate, score trends, follow-up count, review CTA display rate, and review CTA click rate.

## Questionnaire design guideline

Keep completion time around 30–60 seconds. Prefer 4–6 tap-first questions plus one optional free-text field. Templates should vary by clinic, restaurant, salon, and other business types while retaining a small common KPI set so cross-store analysis remains possible.
