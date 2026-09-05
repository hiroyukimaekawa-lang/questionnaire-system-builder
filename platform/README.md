# Questionnaire Platform

営業担当者がブラウザだけで複数店舗・医院のアンケートを作成、複製、編集、プレビュー、公開し、回答確認とCSV出力まで行うNext.js + Supabaseアプリです。下書きと公開版は不変のバージョンで分離され、下書き保存だけでは公開内容が変わりません。

## ローカル起動

```bash
cd platform
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000/login` を開きます。本番はCloudflare Worker `crestix-questionnaire` へ直接配備します。実際の `workers.dev` URLは初回deploy後に確定します。

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

Productionでは、初回Worker deployで確定した実URLを `NEXT_PUBLIC_APP_URL=https://<actual-worker-host>.workers.dev` に設定し、再build / redeployします。Service Role Keyは通常処理では不要で、ブラウザへ絶対に公開しません。

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

Google口コミURLが設定されている場合、完了画面では評価点に関係なく全回答者へ同じCTAを表示します。回答者自身の自由記述だけをコピーできます。

## 設計チャットによる新規作成

「新規アンケート作成」では、目的、対象店舗、業種、準備状況を順に整理します。業種別のおすすめ構成を選ぶと全質問をゼロから入力せずに済み、質問確認、匿名・文章・色・ロゴ・口コミ設定、最終確認を経て初めてSurveyとDraftを保存します。「下書きとして保存」した未完成データは `builder_sessions` に保存され、一覧の「作成途中」から再開できます。

作成後の日常編集は通常の基本・質問・プレビュー・回答画面で行います。既存アンケートの「複製」または「チャットで再設定」は内容を引き継ぎ、全質問を聞き直しません。

## Cloudflare Worker 公開

本番本体は `platform/` をOpenNextで直接Cloudflare Worker `crestix-questionnaire` へ配備します。Pages proxyは本番経路から外し、ロールバック用としてのみ残します。

`wrangler.jsonc` は以下を設定済みです。

- Worker名: `crestix-questionnaire`
- `main`: `.open-next/worker.js`
- `nodejs_compat`
- static assets binding `ASSETS`
- `WORKER_SELF_REFERENCE` → `crestix-questionnaire`
- observability
- `workers_dev: true`

CloudflareアカウントはAccount ID `739ef6b0d4cc5d4e1b5fb1a1ebae94af`、Wrangler profile `crestix-matsuoka` を使用します。deploy前に必ず確認してください。

### Runtime Variables / Build Variables（Git自動デプロイ）

Cloudflare DashboardのGit連携ビルドでは、以下3つを **Runtime Variables** と **Build Variables** の両方に設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Build Variablesはビルド時（`npx opennextjs-cloudflare build`）専用で、Next.jsのビルド出力に埋め込まれます。Runtime Variablesはデプロイ後にWorkerが実行時に参照する値です。

Cloudflareの仕様上、Dashboard側で管理したRuntime Variablesは `wrangler deploy` 実行時に上書き・削除される可能性があるため、`wrangler.jsonc` に `keep_vars: true` を設定し、Git自動デプロイのたびにRuntime Variablesが消えないようにしています。これら3つの値はコードにハードコードせず、`SUPABASE_SERVICE_ROLE_KEY` はこのアプリでは不要なため設定しません（公開クライアントに渡してはいけないため）。

```bash
cd platform
npx wrangler whoami --profile crestix-matsuoka
npm test
npm run lint
npm run typecheck
npm run build
npx opennextjs-cloudflare build
```

Cloudflareへの実deployは手動で行います。

```bash
npm run deploy:crestix-worker
```

初回deploy後に表示された実 `workers.dev` URLを確認し、`NEXT_PUBLIC_APP_URL` とSupabase AuthのSite URL / Redirect URLsを正式Worker URLへ変更してから再deployします。URLは推測で設定しません。

旧 `cloudflare/crestix-questionnaire-pages/` と旧 `survey-pages` Workerは、新Workerで `/login`、`/signup`、`/admin`、Server Actions、公開アンケート、回答送信まで確認できるまでは削除しません。

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
