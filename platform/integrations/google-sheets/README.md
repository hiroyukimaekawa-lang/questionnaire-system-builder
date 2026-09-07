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

## Phase 1 — completed

- `google_sheets_sync_queue` is created.
- Every new response is automatically queued by a database trigger.
- Historical responses are backfilled into the queue.
- Queue writes remain server/database-only; staff can read status.
- `Code.gs` provides an idempotent Apps Script webhook receiver.

## Phase 2 — live response sync implemented

The public response API now follows this order:

1. Validate the answer.
2. Save it to Supabase first.
3. Build the Google Sheets payload from the exact published survey/version and submitted answers.
4. POST it to the Apps Script Web App.
5. Mark the queue row `synced` or `failed` with a server-generated one-time sync token.
6. Return success to the respondent even when Google Sheets is temporarily unavailable.

This keeps Supabase authoritative and prevents a Sheets outage from losing questionnaire answers.

### Security

`GOOGLE_SHEETS_WEBHOOK_SECRET` is server-only and must never use a `NEXT_PUBLIC_` prefix.

The queue status RPC requires both `response_id` and a random `googleSheetsSyncToken` stored in response metadata. The token is created on the server and is never included in the browser response, so anonymous clients cannot arbitrarily mark queue rows as synced.

### Google Apps Script one-time setup

Use the spreadsheet `アンケート回答データ管理`.

1. Open the spreadsheet and create/open a bound Apps Script project via **Extensions → Apps Script**.
2. Replace the script with `platform/integrations/google-sheets/Code.gs`.
3. In **Project Settings → Script Properties**, set:
   - `SPREADSHEET_ID` = the spreadsheet ID.
   - `WEBHOOK_SECRET` = a long random secret.
4. Deploy as **Web app**.
5. Execute as the script owner and allow access required for the deployed web app endpoint.
6. Copy the `/exec` deployment URL.

### Cloudflare runtime configuration

Set both values on the `questionnaire` Worker as runtime secrets/variables:

- `GOOGLE_SHEETS_WEBHOOK_URL` = Apps Script `/exec` URL.
- `GOOGLE_SHEETS_WEBHOOK_SECRET` = the exact same secret used in Script Properties.

Then redeploy `main`. The sender has a 4-second timeout. If the webhook is unavailable or misconfigured, the questionnaire response still succeeds in Supabase and the queue records the failed/pending state for recovery.

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
      "id": "uuid",
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
