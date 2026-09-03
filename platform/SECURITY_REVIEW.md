# Questionnaire Platform Security Review V1

## Architecture and authentication

Production is `crestix-questionnaire.pages.dev` (Pages Advanced Mode proxy) → `survey-pages.hiroyuki-maekawa.workers.dev` (OpenNext Worker) → Supabase. `/{slug}` remains canonical and `/s/{slug}` remains the legacy redirect.

Login uses browser `createBrowserClient().auth.signInWithPassword()`. Credentials go only to the Supabase Auth HTTPS endpoint; passwords are not sent to the app Worker, stored in DB/localStorage, displayed, or logged. Success replaces the route with `/admin` and refreshes it. This removes Server Action `Set-Cookie` propagation across the two-host proxy from the login critical path.

Only `/admin/*` is guarded by the SSR proxy. It creates a client per request, applies refreshed cookies to request and response, and calls `getClaims()` before authorization. `getUser()` is used only when a profile is needed. `/login`, `/auth/*`, public surveys, and `/api/responses` remain public. Auth pages are `private, no-store, max-age=0` with `Vary: Cookie` at both application and Pages layers.

## Cookies and Pages proxy

`cloudflare/crestix-questionnaire-pages/dist/_worker.js` preserves method, body, path, query, Cookie, Authorization and other request headers. It changes only upstream/forwarded host information. When available, `Headers.getSetCookie()` values are appended individually; otherwise the original `Headers` clone is preserved. It does not comma-split cookies or rewrite Domain. Only absolute redirects whose host is the upstream Worker are rewritten to the Pages host.

## Password and recovery

Passwords require at least 8 characters; letters and digits are recommended without imposing additional custom rules. Login and reset results are generic to avoid account enumeration. The Admin reset action rechecks staff/admin server-side and only accepts a profile ID already in `profiles`.

Recovery mail returns to `/auth/confirm?token_hash=...&type=recovery&next=/admin/account/update-password`. `verifyOtp()` establishes the recovery session, then `updateUser({password})` updates it. `next` accepts only same-origin paths beginning with a single `/`.

## RLS, functions, and DB validation

RLS remains enabled on profiles, surveys, survey_versions, questions, question_options, responses, and response_answers. Anonymous readers see only published survey data; response writes use the validation RPC.

The additive migration fixes SECURITY DEFINER `search_path` and EXECUTE grants. Trigger functions are revoked from API roles; `publish_survey` is authenticated-only; `is_admin`/`is_staff` remain intentionally executable by authenticated for RLS. `submit_survey_response` remains intentionally executable by anon/authenticated for public submission.

The RPC validates object/payload shape, question ownership, required answers, per-question 5/10 maxScore, registered choice values, text (1000), textarea (5000), unknown question IDs, and metadata size. Metadata is reduced to `user_agent`, `needsFollowUp`, and `matchedRuleId`.

## Admin/config/completion and headers

Current passwords are never stored or displayed. The final admin cannot be demoted. Design saves merge into existing config, retaining completion, Google review, and unknown future fields. Google review ON/OFF and URL belong to completion settings.

Completion rules use Zod: max 20 rules, 10 conditions each, `and|or`, `gte|lte|eq`, finite integer values, and 1000-character messages. Server validation confirms every question belongs to the current draft, is `rating_10`, and the value is within maxScore.

Headers include nosniff, strict-origin referrer, frame deny, camera/microphone/geolocation deny, plus CSP `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. A strict script-src and HSTS were not added to avoid breaking Next.js or duplicating Cloudflare configuration.

Google review mode remains `disabled|all`. When `all` has a URL, every respondent sees the same CTA regardless of score, answers, completion result, or needsFollowUp.

## Fixed issues and residual risk

- Repository-managed and tested Pages proxy replaces temporary source.
- Browser login removes multi-hop Server Action cookie dependence.
- SSR refresh preserves cookies/cache headers; config overwrite, single-condition UI, weak JSON validation, last-admin, RPC validation, and function privileges were hardened.
- Anonymous callers can still supply whitelisted metadata. `needsFollowUp` is therefore display-only and must never authorize anything. Recompute it behind a trusted boundary if authenticity becomes required.
- The migration is not applied. Check production schema drift, backup, and Supabase Security Advisor before and after applying it.

## Required Supabase Dashboard settings

1. Site URL: `https://crestix-questionnaire.pages.dev`
2. Redirect URLs: `https://crestix-questionnaire.pages.dev/auth/confirm` and `https://crestix-questionnaire.pages.dev/admin/account/update-password`
3. Recovery email template: `https://crestix-questionnaire.pages.dev/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/account/update-password` (use the variable syntax shown by the Dashboard).
4. Enable Leaked Password Protection when the plan supports it.
5. Configure custom production SMTP as sending volume grows.

No secret values belong in documentation.
