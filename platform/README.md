# Questionnaire Platform

営業担当者がブラウザだけで複数店舗・医院のアンケートを作成、複製、編集、プレビュー、公開し、回答確認とCSV出力まで行うNext.js + Supabaseアプリです。下書きと公開版は不変のバージョンで分離され、下書き保存だけでは公開内容が変わりません。

## ローカル起動

```bash
cd platform
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000/login` を開きます。本番の正式 URL は `https://crestix-questionnaire.pages.dev` です。

## Supabase準備とmigration

1. Supabaseプロジェクトを1つ作成します。
2. Supabase CLIで接続し、timestamp順の migration を `supabase db push` で適用します。Auth/security hardening は `202609030001_auth_security_hardening.sql` です。本番では先に `supabase db push --dry-run` とbackupを確認します。
3. 必要なら `supabase/seed.sql` を実行し、水谷眼科診療所と三宮胃腸内科の下書きを登録します。
4. Storageの `questionnaire-assets` bucketとRLSはmigrationで作成されます。

環境変数:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Productionでは `NEXT_PUBLIC_APP_URL=https://crestix-questionnaire.pages.dev` とします。Service Role Keyは通常処理では不要で、ブラウザへ絶対に公開しません。

Supabase DashboardではSite URLを正式URL、Redirect URLsを `/auth/confirm` と `/admin/account/update-password` の正式URLに設定します。Recovery templateは `token_hash`、`type=recovery`、内部 `next` を `/auth/confirm` へ渡すPKCE/OTP形式にします。詳細は [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) を参照してください。

## 初期ユーザーと権限

Supabase Authenticationでメール＋パスワードのユーザーを作ると、トリガーで `profiles` が作成され、初期権限は `sales` になります。最初の管理者はSQL Editorで安全に昇格します。

```sql
update public.profiles set role = 'admin' where email = '実際の管理者メール';
```

`admin` は全操作とアーカイブ、`sales` は作成・編集・プレビュー・公開・回答閲覧・CSVが可能です。

## 運用

- 新規作成: 「新規アンケート作成」から名称、slug、業種を入力。
- 複製: 一覧の「複製」を開き、新名称と新slugを入力。
- 下書き: 基本情報、文章・デザイン、質問Builderを保存。公開版には未反映。
- プレビュー: 編集タブの「プレビュー」で現在の下書きを確認。
- 公開: 「この下書きを公開」。公開スナップショットを固定し、次の編集用下書きを自動生成。
- 非公開: 一覧または編集画面から非公開。`/s/[slug]` は回答不可になる。
- 回答: `/s/[slug]` から匿名送信。公開バージョンIDとともにSupabaseへ保存。
- 回答一覧/CSV: 「回答」タブ。CSVはUTF-8 BOM付き。
- QR: 公開中アンケートの回答画面で表示・PNG保存。

Google口コミURLが設定されている場合、完了画面では評価点に関係なく全回答者へ同じCTAを表示します。回答者自身の自由記述だけをコピーできます。

## 設計チャットによる新規作成

「新規アンケート作成」では、目的、対象店舗、業種、準備状況を順に整理します。業種別のおすすめ構成を選ぶと全質問をゼロから入力せずに済み、質問確認、匿名・文章・色・ロゴ・口コミ設定、最終確認を経て初めてSurveyとDraftを保存します。「下書きとして保存」した未完成データは `builder_sessions` に保存され、一覧の「作成途中」から再開できます。

作成後の日常編集は通常の基本・質問・プレビュー・回答画面で行います。既存アンケートの「複製」または「チャットで再設定」は内容を引き継ぎ、全質問を聞き直しません。

## Cloudflare Pages → Worker 公開

本番経路は `crestix-questionnaire` Pages → Repository管理のAdvanced Mode proxy → `survey-pages` Worker → Supabaseです。アプリは `@opennextjs/cloudflare` とWranglerでWorkerへ配置します。

```bash
npm run preview  # Workers runtimeでローカル確認
npm run deploy   # Cloudflareへbuild + deploy
```

Pages proxyはアプリWorker確認後に別途更新します（本タスクではどちらもdeployしません）。

```bash
cd cloudflare/crestix-questionnaire-pages
npx wrangler pages deploy dist --project-name crestix-questionnaire
```

`wrangler.jsonc` は `nodejs_compat`、static assets、self service binding、observabilityを設定済みです。Supabaseの外部PostgreSQLへ直接接続せずHTTPS APIを使うため、Hyperdriveは不要です。店舗追加や質問変更はDBの下書きと公開操作で完結し、再デプロイは不要です。

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
