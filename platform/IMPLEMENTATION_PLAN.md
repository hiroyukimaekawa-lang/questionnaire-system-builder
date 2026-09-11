# Questionnaire Platform MVP 実装計画・差分レビュー

最終更新: 2026-09-01

## 判定記号

- ✅ 実装済み
- 🟡 一部実装（環境接続後の実機確認等が残る）
- ❌ 未実装
- 🔴 要修正

## 今回要件との差分と対応状況

| 項目 | 調査時 | 現在 | 対応 |
|---|---:|---:|---|
| 目的から始めるGrilling作成 | ❌ | ✅ | 最初に目的を聞き、回答に応じて次を選ぶRuleBasedBuilderEngineを追加 |
| BuilderロジックとUI分離 | ❌ | ✅ | `lib/builder/engine.ts`、`templates.ts` とチャットUIを分離 |
| 業種テンプレート | ❌ | ✅ | クリニック・飲食店・美容室の標準質問をコード管理 |
| 不要質問スキップ | ❌ | ✅ | 口コミ不要時のURL、ロゴなし時の画像、テンプレート利用時の全文入力をスキップ |
| 質問1件ずつの最終確認 | ❌ | ✅ | 質問構成カードを並べて確認後に確定 |
| Shared Understanding / 完成判定 | ❌ | ✅ | 必須情報一覧と `isComplete` をEngineに実装 |
| 作成前の最終確認 | ❌ | ✅ | 店舗・目的・匿名・全質問・口コミ・色を要約し、確認後のみ保存 |
| チャット一時状態とSurvey分離 | 🔴 | ✅ | チャット中はBuilderContextのみ、確定時に初めてSurvey/Draft/Questionsを生成 |
| 戻る・過去回答変更 | ❌ | ✅ | 履歴の「変更」と、業種・テンプレート配下だけを再計算する依存制御 |
| 途中保存・再開 | ❌ | ✅ | `builder_sessions`、RLS、管理画面の「作成途中」「続きから作成」 |
| 2分割チャット＋390pxプレビュー | ❌ | ✅ | PC 50/50、共通SurveyRendererのリアルタイムプレビュー |
| 作成後の通常編集 | ✅ | ✅ | 基本・質問・プレビュー・回答タブを維持し「チャットで再設定」を任意導線化 |
| 複製後の差分確認 | 🟡 | ✅ | 複製元DraftをBuilderContextへ引き継ぎ、必要項目から再開 |
| Draft / Published分離 | ✅ | ✅ | versionスナップショットとpublish RPCを維持 |
| 公開Renderer / 375〜430px | ✅ | ✅ | 共通SurveyRenderer、10段階を10列gridで表示 |
| 口コミCTAの表示設定 | ✅ | ✅ | disabled / all / scoreに対応。scoreはrating質問単位の閾値と複数条件のAND / ORで判定 |
| 回答・version固定・CSV | ✅ | ✅ | transaction RPC、survey/version保持、BOM付きCSV |
| email/password認証 | ✅ | ✅ | Supabase Auth。Magic Link必須なし |
| Admin / Sales | ✅ | ✅ | RLSとサーバー再検証、permission単体テストを追加 |
| DB/Auth/Storage境界 | 🟡 | ✅ | `lib/database`、`lib/auth`、`lib/storage` の移行可能な境界を追加 |
| Cloudflare Workers / OpenNext | ❌ | ✅ | OpenNext adapter、Wrangler、preview/deploy、nodejs_compat、assets、observabilityを追加 |
| Supabase接続を伴う実機E2E | ❌ | 🟡 | 実環境変数・migration適用後に確認が必要 |

## アーキテクチャ

- Next.js 16 App Router / TypeScript / Tailwind CSS。
- Server Componentsで管理・公開データを取得し、編集・回答・Builder UIのみClient Components。
- Supabase PostgreSQL / Auth / Storageを正本とし、RLSと検証付きRPCを利用。
- Cloudflare Workersへ `@opennextjs/cloudflare` で配置可能。店舗設定変更では再デプロイ不要。
- 有料AI API、メールAPI、CMS、画像生成APIは使用しない。

## Builder Engine

`BuilderEngine` interfaceを `RuleBasedBuilderEngine` が実装する。責務は、確定済みContext、未確定必須項目、次のBuilderStep、条件分岐、依存項目の再計算、完成判定。各Stepは `id / question / reason / required / inputType / options` を持つ。将来AIを採用する場合もEngine交換でUIを維持できる。

BuilderContextは目的、店舗名、業種、開始状態、テンプレート、質問、匿名、文章、色、ロゴ、口コミ、完了文、複製元を保持する。未完成時は `builder_sessions.context` のJSONBだけを保存し、正式Surveyとは分離する。

## DB / RLS

- `profiles`: Admin / Sales。
- `surveys`: slug、状態、担当、下書き・公開version参照、監査情報。
- `survey_versions`: immutableな公開版と編集用Draft。
- `questions` / `question_options`: version所属。
- `responses` / `response_answers`: 回答時versionを固定。
- `builder_sessions`: user、任意survey、status、context、current_step、時刻。
- Builder Sessionは本人またはAdminだけがRLSで操作可能。
- 匿名利用者は公開版だけ読取可能。回答の既存行は読取不可で、検証付きRPCだけ実行可能。

## Draft / Preview / Publish

編集はcurrent draftだけを更新する。Publish RPCはそのDraftをpublishedとして固定し、質問と選択肢を複製した次のDraftを生成する。公開URLはcurrent publishedだけを読むため、通常編集やBuilder生成直後には公開内容が変わらない。

## テスト計画と実装

- Builder: 目的・業種・starting point・テンプレート、不要質問skip、不足・完成、依存再計算、ロゴ・口コミ分岐。
- Survey: 必須回答、評価集計、質問validation、slug、CSV。
- Review CTA: URLとdisabled / all / scoreの設定に従って表示する。scoreはrating質問単位の閾値と複数条件のAND / ORに対応し、基本UIは「○点以上」（operator = gte）、既存gte / lte / eq互換を維持する。
- Permission: AdminとSalesの許可差分。
- Quality gate: `npm test`、`npm run lint`、`npm run typecheck`、`npm audit`、`npm run build`、`npm run preview`、`git diff --check`。

## 残る外部作業

- Supabase projectの作成、環境変数設定、2本のmigration適用、初期Admin昇格。
- Cloudflare dashboard / Workers Buildsへ環境変数とsecretを登録。
- 実Supabaseを使うログイン→Builder→公開→回答→CSVの実機E2E。

## 2026-09-10 作成・口コミ・デザイン・公開の拡張

- 既存Next.js / Supabase / Workers、認証・RLS、公開URL、回答一覧・CSVを維持。
- 新規作成を基本情報・質問・口コミ・デザイン・確認の5段階へ統合。既存作成途中データも読めるようにする。
- 業態・都道府県・サブタイトル・文字サイズ・口コミ文章質問を既存config JSONへ追加。unknown fieldsを保持し、不要なテーブル追加を避ける。
- 口コミ設定を共通コンポーネント化。おすすめ・日本語条件文・条件テスト・文章質問選択を作成と編集で共用。
- 質問保存・複製・公開時のID変更に伴う条件参照を補正。下書き／公開版分離を維持する。
- SurveyRendererとThanksPanelをライブプレビューでも共用し、ロゴ・文字・コピー成功／失敗を検証。
- 保存状態と離脱警告、公開済みとの差分状態を表示。
- 条件境界値・後方互換・保存経路のテスト、lint/typecheck/build、スマホ各幅とPCのVisual QA、Workersビルドと配備確認。
- 分析ダッシュボードは追加しない。

## 2026-09-11 一覧復旧・本番Worker統一

- 一覧の外部キー指定を実DBのsurveys_draft_fkへ修正し、取得失敗を0件表示から分離する。
- 作成・公開後に正式Surveyと版の保存状態を検証し、/adminを再検証する。
- 正式Worker、アカウント、URL、Supabase接続先をデプロイ前に検証する。旧WorkerのGit連携と公開アクセスを停止する。
- DB上の既存10アンケート・14回答を維持する。移行は接続先の相違が確認された場合のみ。
- test/lint/typecheck/build、実ブラウザで作成→保存→公開→一覧→回答、各画面幅と再ログインを確認する。
