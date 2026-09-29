# Internal Assistant (V1)

A chat-style Help/Improvement assistant for CRESTIX employees (admin/sales), built
directly into the questionnaire admin UI. Employees see one ordinary chat box — no
"is this a bug or a feature request?" dropdown. Classification happens internally.

## Who sees it

- `admin`, `sales`: yes, when the feature flag is on.
- `viewer`, public respondents, anonymous visitors: never. Enforced both in the UI
  (the button/drawer aren't rendered) and server-side in every
  `/api/internal-assistant/*` route (401 unauthenticated, 403 non-staff/inactive).

## Feature flag

`QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED` (default: **off**). Landing this feature's
code does not expose it anywhere until an environment explicitly sets it to `true`.
See `lib/feature-flags.ts`. The check happens server-side in `app/admin/layout.tsx`
*before* the chat UI's client component is even referenced, so a disabled/viewer
session ships zero assistant JS.

## What it does (V1)

1. Employee opens the drawer, sees an intro message and four suggested prompts (free
   text is always available too).
2. Every message is internally classified into `help | bug | ux_improvement |
   feature_request` — the employee never sees this label.
3. **help** — answered immediately from a fixed knowledge base
   (`lib/assistant/knowledge.ts`, sourced from `FEATURE_GLOSSARY.md`) plus the
   current page context. No match → "現在の仕様からは確認できません。改善要望または確認事項として整理しますか？"
   — it never invents a feature or button that doesn't exist.
4. **bug / ux_improvement / feature_request** — the assistant asks one clarifying
   question first, then (once there's enough signal) offers a short summary and two
   buttons: 「改善要望として送る」/「今回は送らない」. Nothing is persisted until the
   employee explicitly taps the first button.

## Current-page context

Auto-generated on open (`lib/assistant/context.ts`, `AssistantRoot.tsx`) — the
employee never types a URL or ID:

```ts
{
  system: 'questionnaire',
  pagePath, pageType, surveyId?, draftVersionId?,
  userRole, activeSection?, environment, appCommitSha?,
}
```

`draftVersionId` isn't in the URL, so pages that know it (currently the survey
editor) publish it via `AssistantPageContext`. `activeSection` comes from an
`IntersectionObserver` over the survey editor's own section ids
(`basic-information`, `design-copy`, `questions`, `completion-settings`,
`publish-settings`) — only the section **id** is read, never its contents.

**Never included automatically:** respondent answers, respondent names, any PII,
cookies, `Authorization` headers, Supabase service role keys, API keys, OAuth
tokens. `userRole` sent by the client is always overwritten server-side with the
authenticated profile's actual role before it's used for anything.

## Conversation state

Kept in `sessionStorage` (`internal-assistant:history`), capped at the last 20
messages, cleared when the browser tab/session ends. No respondent PII is ever
part of this history — it's only what the employee typed and what the assistant
replied.

## V1 provider: no external AI call

`lib/assistant/fallback-provider.ts` implements `QuestionnaireAssistantProvider`
with a deterministic knowledge-base lookup and a small keyword heuristic for intent
classification (`lib/assistant/intent.ts`) — **no LLM, no external API, no secret
required.** This is intentional for V1: it's fully testable, has zero latency/cost,
and never hallucinates a feature that doesn't exist. See `AI_OS_INTEGRATION.md` for
how this gets swapped for a real model later without touching the chat UI, the API
routes, or the improvement-request flow.

## Extending the knowledge base

Add an entry to `KNOWLEDGE_BASE` in `lib/assistant/knowledge.ts` (id, keywords,
optional `pageTypes`, answer) — do **not** grow a big if/else chain. Update
`FEATURE_GLOSSARY.md` first if the underlying feature's description changed, since
the knowledge base is supposed to mirror it.

## API routes

- `POST /api/internal-assistant/chat` — one conversation turn. Zod-validated,
  rate-limited per user (in-memory, best-effort — see
  `lib/assistant/rate-limit.ts`), auth-gated.
- `POST /api/internal-assistant/improvements` — persists a confirmed Improvement
  Request only. Takes an `x-idempotency-key` header so a retried request never
  creates a duplicate row.

## Persistence

`improvement_requests` table (migration
`20260929070000_internal_assistant_improvements.sql`, **not applied to
Production by this change** — see that migration file and
`supabase/tests/database/internal_assistant_improvements.test.sql` for the RLS
contract): admin reads everything, a reporter reads only their own submissions,
viewer/anonymous have no access at all, only admin can change `status`.

## Known V1 limitations

- Rate limiting is per-warm-instance in-memory, not a distributed Cloudflare
  binding (acceptable for now: this is an authenticated staff-only endpoint, not a
  public one).
- `analyzeImprovement`'s draft (summary/currentBehavior/expectedBehavior/etc.) is
  built with simple heuristics, not real language understanding — it's meant as a
  starting point for a human triager, not a final report.
- No admin UI for browsing `improvement_requests` yet (query Supabase directly).
- No GitHub/Slack notification wiring yet — see `AI_OS_INTEGRATION.md` Phase E.
