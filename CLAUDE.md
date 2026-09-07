# Claude Code Project Instructions

このリポジトリでアンケート公開画面、Preview、Thanks画面、Builder UIを実装・修正するときは、作業開始前に必ず以下を読むこと。

1. `SKILL.md`
2. `SURVEY_DESIGN_SKILL.md`
3. `JAPANESE_WEB_TYPOGRAPHY_SKILL.md`
4. `PLATFORM_REQUIREMENTS.md`
5. `platform/README.md`

## Japanese Web Typography は必須

日本語UIに関する変更では `JAPANESE_WEB_TYPOGRAPHY_SKILL.md` を必ず適用する。

特に以下をコードレビュー・Visual QAの必須条件とする。

- `ありがとうございまし / た。` のような活用語尾の分断を残さない
- 助詞・句読点・1〜2文字だけの孤立を残さない
- 店舗名・医院名・ブランド名を不自然に分断しない
- 日本語本文へ固定 `<br>` を乱用しない
- 日本語見出し・本文で `word-break: break-all` を使わない
- 見出しや固有名詞へ `overflow-wrap: anywhere` を安易に使わない
- `line-break: strict` / `word-break: normal` を基本とする
- 対応ブラウザでは `word-break: auto-phrase` をprogressive enhancementとして使用してよい
- Previewと公開画面で別々のTypographyロジックを作らない
- Thanks画面まで確認する

## Visual QA

UI変更はコードだけで完了判定しない。ローカルサーバーを起動し、実ブラウザで最低限以下を確認する。

- 375px
- 390px
- 430px
- 768px
- Desktop

確認対象:

- 店舗・医院名
- Hero label / H1 / subtitle
- 全質問タイトル
- 必須表示
- 選択肢
- 評価ラベル
- CTA
- Thanks H1 / 完了メッセージ
- Google口コミ案内 / CTA

不自然な改行があれば修正→再表示→再確認を繰り返す。

## 完了前コマンド

`platform/` で以下をすべて実行する。

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

エラーを残したまま完了しない。

## 共通化

- 公開画面は共通 `SurveyRenderer` を使う
- Thanks画面は共通 `ThanksPanel` を使う
- 店舗・slug専用の場当たりCSSを増やさない
- Theme Token / configで店舗差を吸収する
- 営業担当者がGitHub・ターミナル・コードを触らず運用できる状態を優先する

## Google口コミ

Google口コミCTAは店舗ごとにBuilderから設定できるようにする。

対応モード:

- `disabled`: 口コミCTAを表示しない
- `all`: 回答完了者全員に口コミCTAを表示する
- `score`: 指定した評価質問の点数条件を満たした場合のみ口コミCTAを表示する

`score` モードでは、Builder UIから以下を設定できること。

- 判定対象の評価質問
- 比較条件（例: `>=`）
- 閾値
- 複数条件の `AND` / `OR`

例:

```text
待ち時間 >= 9
AND
スタッフ対応 >= 9
```

この場合は各条件を個別評価する。`10 + 8 = 18` のような合計点判定に置き換えない。

回答送信時に判定結果を安全にThanks画面へ受け渡し、条件を満たす場合だけGoogle口コミCTAを表示する。
