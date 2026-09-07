# AGENTS.md

このリポジトリをCodex等のコーディングエージェントで変更する場合、最初に以下を読むこと。

- `SKILL.md`
- `SURVEY_DESIGN_SKILL.md`
- `JAPANESE_WEB_TYPOGRAPHY_SKILL.md`
- `PLATFORM_REQUIREMENTS.md`
- `CODEX_PROMPT.md`
- `PLATFORM_CODEX_PROMPT.md`

## 公開アンケートUIの必須ルール

- mobile first
- 共通 `SurveyRenderer` / `ThanksPanel` を使用する
- 店舗・slug専用の場当たり実装を追加しない
- Theme Token / configで店舗差を吸収する
- Previewと公開画面の表示ロジックを共通化する

## Japanese Web Typography

日本語UIを変更した場合は `JAPANESE_WEB_TYPOGRAPHY_SKILL.md` の完了条件をすべて満たすこと。

禁止例:

```text
ありがとうございまし
た。
```

```text
診療環境づくりのため
に
```

以下を基本にする。

```css
line-break: strict;
word-break: normal;
```

必要に応じて `text-wrap: balance` / `text-wrap: pretty` を使い、対応ブラウザでは `word-break: auto-phrase` をprogressive enhancementとして使用してよい。

短い意味単位以外を `nowrap` で固定しない。日本語見出し・本文に `word-break: break-all` を使わない。

## Visual QA

UI変更後は必ず実画面を以下で確認する。

- 375px
- 390px
- 430px
- 768px
- Desktop

Header / Hero / 全質問 / 選択肢 / CTA / Thanks / Google口コミ案内まで確認する。問題があれば修正して再確認する。

## 完了前チェック

`platform/` で以下を実行する。

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

コードが通るだけでは完了ではない。日本語として自然な表示を実ブラウザで確認してから完了する。

## Google口コミポリシー

共通プラットフォームでは `SKILL.md` / `PLATFORM_REQUIREMENTS.md` の既存ルールを維持し、スコア・回答内容によるGoogle口コミCTAの出し分けを追加しない。
