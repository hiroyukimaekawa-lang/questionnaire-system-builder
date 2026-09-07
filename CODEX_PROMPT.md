# Codex実行用プロンプト

以下をCodexへそのまま渡してください。

```text
# 指示

以下のリポジトリにある要件書を正として、新しい共通アンケートプラットフォームを設計・実装してください。

要件リポジトリ:
https://github.com/hiroyukimaekawa-lang/questionnaire-system-builder

必ず最初に以下を読んでください。

- CODEX_IMPLEMENTATION_SPEC.md
- SKILL.md
- SURVEY_DESIGN_SKILL.md
- JAPANESE_WEB_TYPOGRAPHY_SKILL.md
- USAGE.md

また、現在運用中の参考実装として以下を調査してください。

- https://github.com/hiroyukimaekawa-lang/sangrier-ques-system
- https://github.com/hiroyukimaekawa-lang/kawaratani-clinic-questionnaire
- https://github.com/hiroyukimaekawa-lang/mizutani-eye-questionnaire
- https://github.com/hiroyukimaekawa-lang/sannomiya-clinic-questionnaire

## ゴール

店舗ごとにアンケート用リポジトリを複製する現在の方式を廃止し、

「1つの共通アンケート基盤 + 管理画面 + Supabase上の店舗設定データ」

へ移行してください。

最終的には非エンジニアがGitHub、Vercel、VS Code、ターミナル、GASを触らずに、管理画面だけで以下を完結できることを目標とします。

- 新規店舗作成
- 質問編集
- 質問追加・削除・並び替え
- 必須/任意変更
- デザイン変更
- Google口コミURL設定
- スマホプレビュー
- 下書き保存
- 公開/非公開
- URL発行
- QRコード発行
- 回答確認
- CSV出力

店舗追加や質問変更のたびに再デプロイする設計は禁止です。

## 技術方針

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- モバイルファースト

詳細はCODEX_IMPLEMENTATION_SPEC.mdを厳守してください。

## 日本語Typographyの絶対条件

公開アンケート、管理画面Preview、Thanks画面は `JAPANESE_WEB_TYPOGRAPHY_SKILL.md` を必ず適用してください。

- 日本語として不自然な意味途中の折り返しを残さない
- `ありがとうございまし / た。` のような活用語尾の分断は禁止
- 助詞・句読点・1〜2文字だけの孤立を避ける
- 店舗名・医院名を不自然に分断しない
- 日本語本文・見出しで `word-break: break-all` を使わない
- 見出し・固有名詞へ `overflow-wrap: anywhere` を安易に使わない
- 本文へ固定 `<br>` を乱用しない
- 必要な固定見出しは短い意味単位spanで折り返し候補を限定してよい
- `line-break: strict` / `word-break: normal` を基本とする
- 対応ブラウザでは `word-break: auto-phrase` をprogressive enhancementとして利用してよい
- Previewと公開画面で別々のTypography実装を作らない

Visual QAはコード確認だけで完了としません。

最低限以下を実画面またはスクリーンショットで確認してください。

- 375px
- 390px
- 430px
- 768px
- Desktop

確認対象:

- 店舗・医院名
- Hero
- 全質問タイトル
- 選択肢
- CTA
- Thanks H1
- 完了メッセージ
- Google口コミ案内

不自然な折り返しが見つかった場合は、修正→再表示→再確認を繰り返してください。

## 実装手順

1. 既存参考リポジトリを調査する
2. CODEX_IMPLEMENTATION_SPEC.mdを読む
3. SURVEY_DESIGN_SKILL.md と JAPANESE_WEB_TYPOGRAPHY_SKILL.md を読む
4. 実装開始前に `IMPLEMENTATION_PLAN.md` を作る
5. DBスキーマとRLSを設計する
6. 共通公開アンケート画面を実装する
7. 共通Thanks画面を実装する
8. 管理画面を実装する
9. SANGLIERをseedデータとして移行する
10. 回答保存を実装する
11. Google口コミ導線を実装する
12. QRコードを実装する
13. CSV出力を実装する
14. test / lint / typecheck / buildを実行する
15. 375 / 390 / 430 / Tablet / DesktopでVisual QAする
16. 問題があれば修正してVisual QAを再実行する
17. READMEを更新する
18. ローカル動作確認まで行う

途中確認は原則不要です。

軽微なUI・実装判断は要件に反しない範囲で合理的に決めて進めてください。

## 絶対条件

- スコアによってGoogle口コミへの導線を出し分けない
- 375〜430pxのスマホで崩れない
- 日本語の意味途中・活用語尾で不自然に折り返さない
- Thanks画面までJapanese Web Typography Skillを適用する
- 店舗ごとにリポジトリを作らない
- 店舗設定変更でVercel再デプロイを必要としない
- APIキーや秘密情報をGitへコミットしない
- Supabase Service Role Keyをクライアントへ露出しない
- 匿名回答者が他人の回答を読み取れないRLSにする
- 既存参考リポジトリを直接壊さない

## 完了条件

CODEX_IMPLEMENTATION_SPEC.md の `Definition of Done` に加え、JAPANESE_WEB_TYPOGRAPHY_SKILL.md の提出前最終ゲートをすべて満たしてください。

完了後は以下を報告してください。

1. 実装した機能
2. 作成・変更した主要ファイル
3. DBテーブル
4. RLS内容
5. 日本語Typographyで行った修正
6. 375 / 390 / 430 / Tablet / DesktopのVisual QA結果
7. test / lint / typecheck / build結果
8. ローカル起動方法
9. Supabase初期設定方法
10. Vercelデプロイ方法
11. 未完了項目があればその内容
12. 次に人間側で必要な作業
```
