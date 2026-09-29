# Feature Glossary

This glossary describes what is **actually implemented** in `platform/` today. It is
the knowledge base the internal Help assistant is grounded on
(`lib/assistant/knowledge.ts`) — update both together when behavior changes, and
never let this file describe a feature that doesn't exist yet.

## Login

Email + password via Supabase Auth at `/login`. New sales accounts require admin
approval (`is_active`) before they can sign in and use the platform.

## 案件管理 (manage list)

`/admin` (home) and `/admin/manage` show the surveys a user can see. Each row shows
店舗・医院名, 業種, 担当者, 公開状態, 最終更新日時, 回答数, and links to edit, preview, the
public URL, and responses. Status filters: `draft` (下書き, including `unpublished`),
`published` (公開中), `archived` (削除済み).

## 新規アンケート (new survey)

`/admin/surveys/new` — a 5-step wizard (`SurveyWizard`): 基本情報, 質問作成,
Google口コミ設定, デザイン設定, プレビュー・公開. Creating a survey does not publish it;
it starts as a `draft`.

## Builder

The question editor lets sales/admin add, edit, remove, and reorder questions and
set required/optional and options per question.

## 質問形式 (question types)

- 短文テキスト (`text`)
- 長文テキスト (`textarea`)
- ラジオボタン (`single_choice`, `presentation=radio`)
- プルダウン (`single_choice`, `presentation=select`)
- チェックボックス (`multiple_choice`)
- スコアリング (`rating_10`) — **rating 5点 / 10点**: `settings.maxScore` is `5` or `10`
  (unset legacy questions are treated as 10). The public page renders one row of
  circular buttons plus a min/max label (defaults: 非常に不満 / 非常に満足).

## 匿名 / 記名 (identity)

`identityMode` on the survey config controls what the public page asks:

- **respondent_choice** — the respondent picks 匿名 or 記名 at the top of the form; a
  name field only appears once 記名 is chosen.
- **anonymous_only** — no name field; the 匿名案内文 (anonymous note) shows if set.
- **identified_only** — a name field is always shown and required.
- **legacy** — versions saved before this 3-mode setting existed
  (`identityMode` unset in the config). They keep their exact pre-3-mode behavior: no
  choice UI and no name field at all, ever — even if `anonymous` is `false`. Only an
  explicit `anonymous: true` legacy config still shows the anonymous note. This is
  not a value an admin can pick; it only exists until someone chooses one of the
  three modes above.

## Google口コミ (Google review)

`googleReviewMode`:

- **disabled** — no Google review CTA anywhere on the Thanks screen.
- **all** — the CTA is shown to every respondent.
- **score** — the CTA is shown only if the respondent's answers satisfy a rule.

## 基準点 / AND / OR

A `score` rule is a list of per-question conditions (`{questionId, operator: 'gte',
value}`) combined with `logic: 'and' | 'or'`. **AND** requires every condition to be
met; **OR** requires just one. There is no "sum of scores" mode — each rating
question is evaluated on its own.

## Google口コミURL

`googleReviewUrl` — where the review CTA links to. Required whenever
`googleReviewMode !== 'disabled'`.

## 口コミ用文章として使用する質問 (`reviewTextQuestionId`)

Controls whether — and which — free-text answer gets copied to the clipboard when the
respondent taps the Google review CTA.

- **unset (legacy)** — the first submitted long-text (`textarea`) answer is used.
- **「使用しない」** (`null`) — the Google review CTA still shows, but nothing is
  copied to the clipboard.
- **a specific textarea question** — that question's answer is copied, and the CTA
  invites the respondent to paste it into Google.

## Preview

The editor's preview reuses the exact same `SurveyRenderer` component the public page
uses, in a non-submitting mode. What you see there is what respondents will see.

## Draft Save (下書き保存)

Saves the current survey_version with `status = 'draft'`. **Never** touches the
published version — respondents on the live URL see no change.

## Publish (公開する)

Promotes the current draft to `published` and creates a brand-new draft (copied from
what was just published) so editing can continue immediately.

## Unpublish (非公開にする)

Sets the survey to `unpublished`. The public URL then shows
「現在このアンケートは公開されていません。」and stops accepting responses.

## Responses (回答)

Per-survey response list: submission time, each answer, total score, average score.

## Analytics (分析)

Per-survey analytics view. This is the only survey-related page `viewer`-role users
can open.

## CSV

CSV export of a survey's responses, from the responses page.

## Archive (アーカイブ/削除)

The "delete" action in the manage list is a logical archive
(`status = 'archived'`, `archived_at` set) — **admin only**. Response data is kept.
Admins can restore an archived survey back to `unpublished`.

## Viewer権限

`viewer` role users can only read analytics for the surveys they're allowed to see;
they cannot create, edit, publish, or unpublish anything.
