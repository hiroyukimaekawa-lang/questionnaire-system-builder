# Questionnaire Platform

営業担当者がブラウザだけで複数店舗・医院のアンケートを作成、複製、編集、プレビュー、公開し、回答確認とCSV出力まで行うNext.js + Supabaseアプリです。下書きと公開版は不変のバージョンで分離され、下書き保存だけでは公開内容が変わりません。

## ローカル起動

```bash
cd platform
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000/login` を開きます。本番はCloudflare Worker `questionnaire` へ直接配備します。実際の `workers.dev` URLは初回deploy後に確定します。

## Supabase準備とmigration

1. Supabaseプロジェクトを1つ作成します。
2. timestamp順のmigrationを適用します。本番ではmigration内容とbackupを確認してから反映します。
3. 必要なら `supabase/seed.sql` を実行し、水谷眼科診療所と三宮胃腸内科の下書きを登録します。
4. Storageの `questionnaire-assets` bucketとRLSはmigrationで作成されます。

環境変数:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Productionでは `NEXT_PUBLIC_APP_URL=https://questionnaire.survey-system.workers.dev` に固定します。Service Role Keyは通常処理では不要で、ブラウザへ絶対に公開しません。

Supabase DashboardではSite URLを正式Worker URL、Redirect URLsを `/auth/confirm` と `/admin/account/update-password` の正式Worker URLに設定します。Recovery templateは `token_hash`、`type=recovery`、内部 `next` を `/auth/confirm` へ渡すPKCE/OTP形式にします。詳細は [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) を参照してください。

## 初期ユーザーと権限

新規登録は `@crestix-inc.com` の完全一致ドメインだけを許可します。対象ユーザーはトリガーで `role='sales'`、`is_active=true` として作成され、管理者の手動承認なしで利用開始できます。既存adminは変更しません。

`admin` は全操作とアーカイブ、`sales` は作成・編集・プレビュー・公開・回答閲覧・CSVが可能です。`/admin/users` は利用停止・再有効化・role管理に使います。

## 運用

- 新規作成: 「新規アンケート作成」から名称、slug、業種を入力。
- 複製: 一覧の「複製」を開き、新名称と新slugを入力。
- 下書き: 基本情報、文章・デザイン、質問Builderを保存。公開版には未反映。
- プレビュー: 編集タブの「プレビュー」で現在の下書きを確認。
- 公開: 「アンケートを公開する」。公開スナップショットを固定し、次の編集用下書きを自動生成。
- 非公開: 一覧または編集画面から非公開。公開URLは回答不可になる。
- 回答: `/{slug}` から匿名送信。公開バージョンIDとともにSupabaseへ保存。
- 回答一覧/CSV: 「回答」タブ。CSVはUTF-8 BOM付き。
- QR: 公開中アンケートの公開URLから生成。

Google口コミ導線は `disabled`（非表示）、`all`（全回答者に表示）、`score`（指定したrating質問のスコア条件を満たす場合に表示）の3モードを許可する。 `score` は質問単位の閾値と複数条件のAND / ORに対応する。基本UIは「○点以上」（`operator = gte`）とし、既存の `gte` / `lte` / `eq` との互換性を維持する。 Google口コミURLが設定され、モードの表示条件を満たす場合に完了画面でCTAを表示します。回答者自身の自由記述だけをコピーできます。

## 設計チャットによる新規作成

「新規アンケート作成」では、目的、対象店舗、業種、準備状況を順に整理します。業種別のおすすめ構成を選ぶと全質問をゼロから入力せずに済み、質問確認、匿名・文章・色・ロゴ・口コミ設定、最終確認を経て初めてSurveyとDraftを保存します。「下書きとして保存」した未完成データは `builder_sessions` に保存され、一覧の「作成途中」から再開できます。

作成後の日常編集は通常の基本・質問・プレビュー・回答画面で行います。既存アンケートの「複製」または「チャットで再設定」は内容を引き継ぎ、全質問を聞き直しません。

## Cloudflare Worker 公開

本番本体は `platform/` をOpenNextで直接Cloudflare Worker `questionnaire` へ配備します。Pages proxyは本番経路から外し、ロールバック用としてのみ残します。

`wrangler.jsonc` は以下を設定済みです。

- Worker名: `questionnaire`
- `main`: `.open-next/worker.js`
- `nodejs_compat`
- static assets binding `ASSETS`
- `WORKER_SELF_REFERENCE` → `questionnaire`
- observability
- `workers_dev: true`

CloudflareアカウントはAccount ID `739ef6b0d4cc5d4e1b5fb1a1ebae94af`、Wrangler profile `crestix-matsuoka` を使用します。deploy前に必ず確認してください。

### Runtime Variables / Build Variables（Git自動デプロイ）

Cloudflare DashboardのWorker → Settings → Buildsで、Git自動デプロイを以下に統一します。

| 項目 | 設定値 |
| --- | --- |
| Production branch | `main` |
| Root directory | `platform` |
| Build command | 空欄（deploy / upload script内でビルド） |
| Production Deploy command | `npm run deploy` |
| Version / Preview branch command（Non-production branch deploy command） | `npm run upload` |

非本番ブランチのビルドを有効にすると、`upload` がOpenNextでビルドしたWorkerを新しいバージョンとしてアップロードします。`npm run preview` はローカル確認用です。

モノレポのリポジトリ直下には `package.json` / `wrangler.jsonc` がないため、Root directoryは必ず `platform` に設定してください。設定が異なるとこれらを見つけられず失敗します。`upload` scriptの追加だけではコマンドの実行ディレクトリは変わりません。`npx wrangler versions upload` をリポジトリルートから直接実行しないでください。

参考: [Cloudflare Builds設定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[OpenNext CLI](https://opennext.js.org/cloudflare/cli)。

Cloudflare DashboardのGit連携ビルドでは、以下3つを **Runtime Variables** と **Build Variables** の両方に設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Build Variablesはビルド時（`npx opennextjs-cloudflare build`）専用で、Next.jsのビルド出力に埋め込まれます。Runtime Variablesはデプロイ後にWorkerが実行時に参照する値です。

Cloudflareの仕様上、Dashboard側で管理したRuntime Variablesは `wrangler deploy` 実行時に上書き・削除される可能性があるため、`wrangler.jsonc` に `keep_vars: true` を設定し、Git自動デプロイのたびにRuntime Variablesが消えないようにしています。公開URLとプロジェクトIDはデプロイ検証に固定し、キーは環境変数で渡します。`SUPABASE_SERVICE_ROLE_KEY` はこのアプリでは不要なため設定しません（公開クライアントに渡してはいけないため）。

```bash
cd platform
npx wrangler whoami --profile crestix-matsuoka
npm test
npm run lint
npm run typecheck
npm run build
npx opennextjs-cloudflare build
```

本番は survey アカウントの `questionnaire` Workerのみです。mainへのpushはCloudflare Buildsから `npm run deploy` を実行します。旧 `questionnaire-system-builder` のGit連携は解除し、非本番ブランチの自動ビルドも有効にしません。CLIのデプロイ前チェックでWorker名・アカウント・本番URL・Supabase接続先を検証します。

正式URL: `https://questionnaire.survey-system.workers.dev`、管理画面: `/admin`、公開アンケート: `/s/{slug}`。従来の `/{slug}` は既存リンク・旧308キャッシュの互換性のため同じRendererに委譲し、URL/QRは `/s/{slug}` のみ生成します。

Supabaseは `acfheksrpwdbxoahnwit` を使用します。旧Workerも同じプロジェクトを参照していたためデータ移行は不要です。WorkerにはASSETSと自己参照のService bindingだけがあり、アンケート・回答の正本はSupabaseです。旧WorkerはGit連携解除後に公開アクセスを停止し、復旧用に保持できます。

一覧は `surveys_draft_fk` で下書きを取得します。存在しない外部キー名でPGRST200になった場合も0件にせず、ログと再試行可能なエラー画面を表示します。「すべて」は正式アンケート（archived以外）、「作成途中」はbuilder_sessionsのみです。公開RPC成功後はSurveyを再取得し、公開状態・公開版ID・公開日時を検証します。

Supabaseの外部PostgreSQLへ直接接続せずHTTPS APIを使うため、Hyperdriveは不要です。店舗追加や質問変更はDBの下書きと公開操作で完結し、再デプロイは不要です。

## 品質確認

```bash
npm test
npm run lint
npm run typecheck
npm audit
npm run build
```

RLSでは匿名利用者に公開版の読取だけを許可し、回答保存は検証付きRPCに限定しています。匿名利用者はプロフィール、下書き、既存回答を取得できません。

LoginはbrowserからSupabase Auth HTTPS endpointへ直接送信し、passwordはアプリWorker・DB・ログへ渡しません。Recoveryは `/auth/confirm` でOTPを検証し、認証済みsessionで更新します。`/login`、`/admin/*`、`/auth/*` は共有cache禁止です。
