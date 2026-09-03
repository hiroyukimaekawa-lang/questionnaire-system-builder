# crestix-questionnaire Pages proxy

`crestix-questionnaire.pages.dev` で受けたリクエストを、path・query・method・body・Cookie・Authorization を保ったまま `survey-pages.hiroyuki-maekawa.workers.dev` へ転送する Pages Advanced Mode Worker です。

`/login`、`/admin/*`、`/auth/*` は `private, no-store, max-age=0` と `Vary: Cookie` を保証します。upstream 自身を指す絶対 redirect だけ公開 host に戻し、相対 redirect と外部 redirect は変更しません。Cookie の Domain は必要性が確認されていないため書き換えません。

検証・デプロイ（本タスクでは未実行）:

```bash
cd cloudflare/crestix-questionnaire-pages
npx wrangler pages deploy dist --project-name crestix-questionnaire
```
