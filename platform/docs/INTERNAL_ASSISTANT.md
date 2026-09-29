# Internal Assistant (V1)

A chat-style Help/Improvement assistant for CRESTIX employees (admin/sales), built
directly into the questionnaire admin UI. Employees see one ordinary chat box — no
"is this a bug or a feature request?" dropdown. Classification happens internally.

## Who sees it

- `admin`, `sales`: yes, when the feature flag is on.
- `viewer`, public respondents, anonymous visitors: never. Enforced in the UI (the
  button/drawer aren't rendered) **and independently** in every
  `/api/internal-assistant/*` route: the feature flag is checked first (404 when
  off, before any auth/Supabase call), then auth (401 unauthenticated, 403
  non-staff/inactive). A direct API call can't reach the provider or the database
  by skipping the UI.

## Feature flag

`QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED` (default: **off**). Landing this feature's
code does not expose it anywhere until an environment explicitly sets it to `true`.
See `lib/feature-flags.ts`. It's checked in two independent places, both before
anything else runs:

- `app/admin/layout.tsx`, before the chat UI's client component is even referenced
  (dynamic import, `ssr:false`) — a disabled/viewer session ships zero assistant JS.
- The top of both API routes (`app/api/internal-assistant/chat/route.ts`,
  `.../improvements/route.ts`), before `authorizeAssistantRequest()` — a disabled
  environment never reaches a Supabase query, the provider, or an
  `improvement_requests` insert, even via a direct API call.

### Release prerequisite: migration before flag

Turning the flag on in an environment requires the `improvement_requests`
migration (`20260929070000_internal_assistant_improvements.sql`) to already be
applied there — the improvements API will fail every insert otherwise. Order:

1. Apply the migration.
2. Read-only confirm: `improvement_requests` exists with the expected RLS (see
   `supabase/tests/database/internal_assistant_improvements.test.sql`).
3. Deploy the app (flag still off — no behavior change for anyone).
4. Smoke-test with the flag off (existing admin/sales/viewer flows unaffected).
5. Turn `QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED=true` on for a limited/admin
   audience first, then expand.

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

`draftVersionId` isn't in the URL, and the client never supplies it: both API
routes resolve it themselves from `surveyId` via `resolveDraftVersionId()`
(`lib/assistant/resolve-draft-version.ts`), using the caller's own authenticated,
RLS-scoped Supabase client — the same access any other staff page has to that
survey. This is deliberate: the survey editor (`SurveyEditorWorkspace.tsx`) has
**no import or dependency on the assistant at all**, and a client-supplied
`draftVersionId` would be an unverified value attributed to the request context.
`activeSection` comes from an `IntersectionObserver` over the survey editor's own
section ids (`basic-information`, `design-copy`, `questions`,
`completion-settings`, `publish-settings`) — only the section **id** is read,
never its contents, and this observation is DOM-based (no code coupling back into
the editor component).

**Never included automatically:** respondent answers, respondent names, any PII,
cookies, `Authorization` headers, Supabase service role keys, API keys, OAuth
tokens. `userRole` sent by the client is always overwritten server-side with the
authenticated profile's actual role before it's used for anything.

## Conversation state

Kept in `sessionStorage`, capped at the last 20 messages, cleared when the browser
tab/session ends. The storage key is not a fixed string — `app/admin/layout.tsx`
computes a stable per-user key (`assistantHistoryStorageKey()` in
`lib/assistant/storage-key.ts`, a truncated SHA-256 of the user id) and passes it
down through `AssistantMount` → `AssistantRoot` → `AssistantDrawer`. This matters
because `sessionStorage` is scoped to the browser tab/origin, not to who's
currently logged in: if employee A logs out and employee B logs into the same tab
without closing it, a fixed key would let B read A's conversation. No respondent
PII is ever part of this history — it's only what the employee typed and what the
assistant replied.

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
