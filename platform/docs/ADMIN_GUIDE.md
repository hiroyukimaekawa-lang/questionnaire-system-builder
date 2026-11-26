# Admin Guide (管理者向け)

管理者(`admin`)だけが実行できる操作です。`sales`/`viewer`には表示・実行されません。

## ユーザー管理 (`/admin/users`)

- 社員アカウントの権限変更(admin/sales/viewer)
- 利用停止・再有効化(パスワードそのものは表示・保存しません)
- パスワードリセットの送信
- 新規sales登録は承認制で、`is_active=false`のまま作成され、管理者が有効化するまでログインできません

## 招待管理 (`/admin/invitations`)

案件単位で外部ユーザーを招待し、権限(閲覧など)と状態(招待中/利用中/期限切れ/停止)を管理します。

## アンケートの削除・復元

一覧からの「削除」は物理削除ではなく論理アーカイブ(`status='archived'`)です。管理者のみ実行でき、
回答データは保持されます。アーカイブ済み案件は管理者のみ「復元」(非公開状態へ)できます。

## アンケートAI(内部Assistant)の有効化

環境変数 `QUESTIONNAIRE_INTERNAL_ASSISTANT_ENABLED=true` を設定した環境でのみ、
管理画面に「AIに質問」ボタンが表示されます。未設定(既定値)では admin/sales どちらにも表示されません。
詳細は `INTERNAL_ASSISTANT.md` を参照してください。

## 改善要望(Improvement Requests)の確認

社員がアンケートAIから「改善要望として送る」を押した内容は、Supabaseの
`improvement_requests` テーブルに保存されます(この機能はまだ管理画面UIを持たず、Supabase側から確認します)。
管理者は全件を閲覧・ステータス更新(`submitted`→`triaging`→…→`resolved`/`closed`)できます。
sales/担当者は自分が送った要望のみ閲覧でき、ステータスの変更はできません。
