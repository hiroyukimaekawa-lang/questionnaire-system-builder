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
4. `イベント` — behavioral events such as review CTA display/click (Phase 3).

## Phase 1 — completed in repository

- Add `google_sheets_sync_queue`.
- Automatically enqueue every new response with a database trigger.
- Backfill existing responses into the queue.
- Keep queue writes server/database-only; staff can read queue status.
- Add an idempotent Apps Script webhook receiver template (`Code.gs`).

Applying the migration is required in the production Supabase project before the queue becomes active.

## Phase 2 — connect the live spreadsheet

Deploy `Code.gs` as a Google Apps Script Web App, then configure Script Properties:

- `SPREADSHEET_ID`: the target Google Sheet ID.
- `WEBHOOK_SECRET`: a long random secret shared only with the Cloudflare Worker.

After deployment, configure Cloudflare runtime secrets/variables:

- `GOOGLE_SHEETS_WEBHOOK_URL`
- `GOOGLE_SHEETS_WEBHOOK_SECRET`

The Worker-side sender should POST one response payload at a time. `response.id` is the idempotency key, so retries do not duplicate rows.

Expected payload shape:

```json
{
  "secret": "<shared secret>",
  "store": {
    "id": "uuid",
    "name": "店舗・医院名",
    "industry": "clinic",
    "slug": "example",
    "status": "published",
    "googleReviewUrl": "https://...",
    "publishedAt": "2026-09-07T00:00:00Z",
    "responseCount": 10
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
  "events": []
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
