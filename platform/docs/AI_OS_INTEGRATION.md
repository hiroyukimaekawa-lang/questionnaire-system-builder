# AI OS Integration Boundary

Where the questionnaire app stops and a future **CRESTIX AI OS / Employee Agent /
Improvement Agent** pipeline begins, and the rule that keeps that boundary real
instead of aspirational: **no AI provider (OpenAI, Anthropic, Gemini, or the future
AI OS itself) gets a domain-specific integration written directly into questionnaire
code.** Everything questionnaire code needs from "the AI part" goes through
`QuestionnaireAssistantProvider` (`lib/assistant/types.ts`):

```ts
interface QuestionnaireAssistantProvider {
  answerHelp(input: HelpAnswerInput): Promise<AssistantReply>;
  analyzeIntent(input: IntentAnalysisInput): Promise<AssistantIntentResult>;
  analyzeImprovement(input: ImprovementAnalysisInput): Promise<ImprovementProposalDraft>;
}
```

Today, `FallbackAssistantProvider` (`lib/assistant/fallback-provider.ts`) implements
this with a static knowledge base and keyword heuristics — no network call. Swapping
it for a `CrestixAiOsProvider` later means writing a new class that implements the
same three methods and changing one wiring point
(`app/api/internal-assistant/chat/route.ts`'s `provider` argument to
`runConversationTurn`) — the chat UI, the API route's auth/validation, and the
Improvement Request persistence flow don't change.

## Planned pipeline (not built yet)

```
Questionnaire (this repo)
  ↓ ImprovementProposal (confirmed by the employee)
Crestix AI OS
  ↓
Employee Agent
  ↓
Improvement Agent
  ↓
GitHub (issue / branch / PR)
  ↓
Developer notification (Slack etc.)
```

`ImprovementProposal` (`context` + `ImprovementProposalDraft`) is the payload shape
this pipeline is designed around — it's already what
`POST /api/internal-assistant/improvements` persists.

`DeveloperNotifier` is a **planned** interface, not implemented in this change: a
seam for "tell a human a request came in" that starts as a no-op and later becomes a
Slack/GitHub call, without questionnaire code depending on Slack or GitHub
directly. **Do not wire an actual Slack/GitHub call in a "V1 chat assistant" change**
— that's explicitly out of scope until AI OS Phase E.

## What must never happen automatically, at any phase

Regardless of how far the AI OS pipeline gets automated later, none of the
following may be performed by an agent without human approval:

- `git merge` into `main`
- Production deploy
- Production database migration apply
- Production data mutation (including response/answer data)
- Any destructive operation (`DROP`, `TRUNCATE`, mass `DELETE`)

The Improvement Request flow in this repo stops at "a structured request exists in
`improvement_requests`" — it does not open a GitHub issue, does not message Slack,
and does not touch any repository automatically.

## Context, not secrets

Everything the AI OS side would need to act on a request is already non-secret,
structured data: `QuestionnaireAssistantContext` (page/role/survey/version/build
identity) and `ImprovementProposal`. No Supabase service role key, API key, OAuth
token, or respondent PII is ever part of this boundary — see `INTERNAL_ASSISTANT.md`
for the exact exclusion list enforced in `lib/assistant/context.ts` and the API
routes' Zod schemas.

## Implementation phases (for future work, not all done in this change)

- **Phase A** — Manual + feature registry + context (`FEATURE_GLOSSARY.md`,
  `lib/assistant/knowledge.ts`, `lib/assistant/context.ts`). Done.
- **Phase B** — Chat UI + Help (`components/assistant/*`, `answerHelp`). Done.
- **Phase C** — Intent classification (`lib/assistant/intent.ts`). Done (heuristic
  V1; a real classifier is a provider swap, not a UI change).
- **Phase D** — Improvement confirmation + persistence
  (`POST /api/internal-assistant/improvements`, `improvement_requests` table). Done
  for V1 (manual Supabase triage; no admin UI yet).
- **Phase E** — AI OS / `DeveloperNotifier` / GitHub flow. Not started. Requires a
  real `CrestixAiOsProvider`, a real notification channel, and — before any of it
  can touch `main` or Production — explicit human approval on every merge/deploy/
  migration/data step, same as everything else in this repo.
