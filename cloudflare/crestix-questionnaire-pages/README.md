# crestix-questionnaire Pages proxy

> DEPRECATED / rollback only

このPages Advanced Mode proxyは、旧本番経路 `crestix-questionnaire.pages.dev` → `survey-pages.hiroyuki-maekawa.workers.dev` をロールバック用に残しているものです。新しい本番構成では使用しません。

現在の本番移行先は `platform/` を直接Cloudflare Worker `crestix-questionnaire` として配備する構成です。新Workerの動作確認が完了するまでは、このPagesプロジェクトと旧 `survey-pages` Workerを削除しないでください。

旧proxyはpath・query・method・body・Cookie・Authorizationを保ったままupstreamへ転送し、`/login`、`/admin/*`、`/auth/*` を `private, no-store, max-age=0` + `Vary: Cookie` で扱います。

ロールバック時のみ再デプロイします。

```bash
cd cloudflare/crestix-questionnaire-pages
npx wrangler pages deploy dist --project-name crestix-questionnaire --profile crestix-matsuoka
```
