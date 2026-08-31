# Questionnaire Platform｜営業向けWebアプリ 実装要件

## 1. 目的

現在のアンケート制作は、案件ごとに個別リポジトリを作成し、Codex・GitHub・Vercel等を利用して構築している。

今後は、営業担当者がGitHub・Codex・Vercel・ターミナル・ソースコードを直接操作しなくても、ブラウザ上の管理画面だけでアンケートを作成・編集・プレビュー・公開・回答確認できるWebアプリケーションへ移行する。

本リポジトリ `questionnaire-system-builder` を正本とし、新しい別リポジトリは作成しない。

既存の以下の仕様書は引き続き参考資料として保持する。

- `SKILL.md`
- `USAGE.md`
- `CODEX_IMPLEMENTATION_SPEC.md`
- `CODEX_PROMPT.md`

Webアプリ本体は原則として本リポジトリ内の `platform/` 配下に実装する。

---

## 2. 最終ゴール

営業担当者が以下の操作だけで新しいアンケートを公開できる状態を作る。

```text
ログイン
↓
アンケート一覧
↓
新規作成
↓
店舗・医院情報入力
↓
質問設定
↓
デザイン調整
↓
下書き保存
↓
プレビュー
↓
公開
↓
公開URL発行
↓
回答取得
↓
管理画面で回答確認
```

営業担当者は以下を操作しない。

```text
GitHub
Codex
Vercel
.env
GAS
ソースコード
ターミナル
```

---

## 3. 技術構成

原則として以下を使用する。

```text
Frontend / Backend : Next.js App Router
Language           : TypeScript
UI                 : Tailwind CSS
Database           : Supabase PostgreSQL
Authentication     : Supabase Auth
Storage            : Supabase Storage
Hosting            : Vercel
```

回答データの正本はSupabaseとする。

Google Sheets / GASは初期MVPでは必須とせず、将来の外部連携先として扱う。

---

## 4. リポジトリ構成

新しいGitHubリポジトリは作らない。

```text
questionnaire-system-builder/
├── SKILL.md
├── USAGE.md
├── CODEX_IMPLEMENTATION_SPEC.md
├── CODEX_PROMPT.md
├── PLATFORM_REQUIREMENTS.md
├── PLATFORM_CODEX_PROMPT.md
└── platform/
    └── Webアプリ本体
```

既存のBuilder仕様書を壊さず、Webアプリ本体を追加する。

---

## 5. マルチテナント設計

1つのWebアプリケーションで複数店舗・医院のアンケートを管理する。

案件ごとに新しいGitHubリポジトリやVercel Projectを作成してはならない。

例：

```text
Questionnaire Platform
├── 水谷眼科診療所
├── 三宮胃腸内科
├── 瓦谷クリニック
├── SANGLIER
├── 店舗A
└── 店舗B
```

---

## 6. URL設計

管理画面：

```text
/admin
```

ログイン：

```text
/login
```

公開アンケート：

```text
/s/[slug]
```

例：

```text
/s/mizutani-eye
/s/sannomiya-clinic
/s/sanglier
```

下書きプレビュー：

```text
/admin/surveys/[id]/preview
```

---

## 7. ユーザー権限

最低限 `admin` と `sales` の2権限を実装する。

### Admin

- 全アンケート閲覧
- 新規作成
- 編集
- プレビュー
- 公開
- 非公開
- 論理削除
- 回答閲覧
- CSV出力
- ユーザー管理

### Sales

- アンケート一覧閲覧
- 新規作成
- 編集
- プレビュー
- 公開
- 回答閲覧
- CSV出力

将来的に「自分が担当する案件だけ閲覧・編集できる」設計へ拡張可能にする。

---

## 8. 管理画面

管理画面トップには最低限以下を表示する。

- 店舗・医院名
- 業種
- 担当者
- 公開状態
- 最終更新日時
- 回答数
- 編集
- プレビュー
- 公開URL
- 回答を見る

ステータスは最低限以下を持つ。

```text
draft      下書き
published  公開中
unpublished 非公開
archived   アーカイブ
```

---

## 9. 新規アンケート作成

管理画面に「新規アンケート作成」ボタンを設置する。

基本情報として以下を編集可能にする。

- 店舗・医院名
- slug
- 業種
- 担当営業
- 説明
- 冒頭文章
- 匿名説明文
- メインカラー
- 背景色
- ロゴ
- アイコン
- Google口コミURL
- 送信ボタン文言
- 完了画面文章

slugは自動生成し、手動修正も可能にする。

---

## 10. デザイン設定

営業担当者が以下を変更できるようにする。

- メインカラー
- 背景色
- ロゴ
- アイコン
- タイトル
- 説明文章
- 送信ボタン文言
- 完了画面文言

初期MVPでは複雑な自由配置型デザインエディタは不要。

カラー・ロゴ・文章を簡単に変更できることを優先する。

---

## 11. 質問Builder

最低限以下の質問タイプを実装する。

```text
single_choice    単一選択
multiple_choice  複数選択
rating_10        1〜10評価
textarea         自由記述
text             短文入力
```

質問ごとに以下を設定可能にする。

- 質問タイトル
- 質問タイプ
- 必須 / 任意
- 説明文
- 選択肢
- 表示順
- 補助設定

1〜10評価では以下を設定可能にする。

- 左側ラベル
- 右側ラベル

初期値：

```text
非常に不満
非常に満足
```

---

## 12. 質問並び替え

ドラッグ＆ドロップ、または上下移動ボタンで順番を変更できるようにする。

DBでは `sort_order` を保持する。

---

## 13. Draft / Preview / Publish

最重要要件。

編集内容を保存しただけでは現在公開中のアンケートへ反映してはならない。

必ず以下のフローとする。

```text
編集
↓
下書き保存
↓
プレビュー
↓
公開
```

営業担当者が編集中に本番を壊さない設計にする。

公開データと下書きデータを明確に分離する。

実装方法は `survey_versions` 方式を推奨するが、同等以上に安全な方式であれば変更してよい。

---

## 14. プレビュー

管理画面の「プレビュー」から、公開前の下書き状態を確認できるようにする。

スマートフォンを最優先とし、最低限以下の幅で崩れないこと。

```text
375px
390px
430px
```

---

## 15. 公開機能

「公開する」を押した時点で下書きを本番へ反映する。

公開URLは以下の形式とする。

```text
/s/[slug]
```

アンケート追加・質問変更・色変更・文章変更のたびにVercel再デプロイを必要としない。

DB設定を変更し「公開」するだけで反映されること。

---

## 16. 非公開機能

公開中のアンケートを管理画面から非公開にできるようにする。

非公開時に公開URLへアクセスした場合は、例えば以下を表示する。

```text
現在このアンケートは公開されていません。
```

---

## 17. 公開アンケートRenderer

`/s/[slug]` へアクセスした際、Supabaseからそのアンケートの公開中バージョンを取得し、質問設定に応じて動的に画面を生成する。

店舗ごとにコードを分岐させない。

---

## 18. モバイルファースト

回答画面はスマートフォン利用を最優先とする。

推奨：

```text
max-width: 430px
```

PCでは中央配置する。

1〜10評価は375pxでも横一列表示し、横スクロールを発生させない。

---

## 19. Validation

必須質問が未回答の場合、質問直下へ分かりやすいエラーを表示する。

例：

```text
この項目は必須です
```

送信時は最初のエラー位置へ誘導する。

---

## 20. 回答保存

回答データはSupabaseへ保存する。

最低限以下を保持する。

- survey_id
- survey_version_id
- response_id
- submitted_at
- 各回答
- total_score
- average_score

質問構成が変更されても過去回答の意味が失われないよう、回答時の `survey_version_id` を必ず保持する。

---

## 21. 回答一覧

管理画面からアンケート単位の回答を閲覧できるようにする。

質問数が可変のため、必要に応じて横スクロール可能なテーブルとする。

最低限以下を確認できること。

- 回答日時
- 各質問への回答
- 合計スコア
- 平均スコア

---

## 22. CSV出力

アンケート単位でCSVダウンロードできるようにする。

CSVには以下を含める。

- 回答日時
- 各質問
- 合計スコア
- 平均スコア

日本語版Excelで文字化けしにくい形式を考慮する。

---

## 23. Google口コミURL

店舗ごとにGoogle口コミ投稿URLを設定できるようにする。

URLが設定されている場合、回答完了画面へGoogle口コミCTAを表示する。

重要：点数によって口コミCTAを表示・非表示にする実装は禁止する。

Google口コミURLが設定されている場合は、全回答者へ同条件で表示する。

低評価者向けに改善メッセージを表示すること自体は可能だが、口コミCTAの表示条件とは独立させる。

---

## 24. 匿名アンケート

デフォルトでは以下の個人情報を取得しない。

- 氏名
- 電話番号
- メールアドレス
- 住所

必要な案件では質問として追加可能な設計とする。

---

## 25. Supabase DB案

最低限以下のテーブルを検討する。

```text
profiles
surveys
survey_versions
questions
question_options
responses
response_answers
```

### profiles

- id
- name
- email
- role
- created_at

### surveys

- id
- name
- slug
- industry
- status
- owner_user_id
- created_by
- updated_by
- created_at
- updated_at
- published_at
- archived_at

### survey_versions

- id
- survey_id
- version
- status
- config
- created_by
- created_at
- published_at

### questions

- id
- survey_version_id
- type
- title
- description
- required
- sort_order
- settings

### question_options

- id
- question_id
- label
- value
- sort_order

### responses

- id
- survey_id
- survey_version_id
- submitted_at
- total_score
- average_score

### response_answers

- id
- response_id
- question_id
- value

より適切な正規化・JSONB併用設計がある場合は改善してよい。

---

## 26. Supabase Storage

ロゴ・店舗アイコン・将来的な画像はSupabase Storageへ保存する。

---

## 27. Authentication

Supabase Authを使用する。

初期MVPではメールアドレス＋パスワード、またはMagic Linkでよい。

社内利用のため、Google OAuthは初期必須ではない。

---

## 28. セキュリティ

Supabase RLSを必ず使用する。

一般ユーザーから以下へアクセスできないようにする。

- 管理画面データ
- 他案件の回答
- 営業担当者情報
- 下書きバージョン

公開ページでは `published` 状態のアンケート情報のみ取得可能にする。

回答送信に必要な最小権限のみ許可する。

Service Role Keyをブラウザへ露出させてはならない。

---

## 29. 二重送信対策

回答送信中は送信ボタンを無効化し、送信状態を表示する。

例：

```text
送信中...
```

連打による二重登録を防止する。

---

## 30. Google Sheets連携

初期MVPでは必須ではない。

将来的に店舗単位でGoogle Sheetsへ同期できる拡張ポイントを確保する。

Supabaseを正本とし、Google Sheetsを正本にはしない。

---

## 31. 既存参考実装

以下を参考データ・正解データとして利用可能とする。

```text
questionnaire-system-builder
kawaratani-clinic-questionnaire
mizutani-eye-questionnaire
sannomiya-clinic-questionnaire
sangrier-ques-system
```

参考リポジトリを変更してはならない。

---

## 32. 初期データ移行

MVP完成後、最低限以下をプラットフォームへ登録可能にする。

### 水谷眼科診療所

```text
name: 水谷眼科診療所
slug: mizutani-eye
```

### 三宮胃腸内科

```text
name: 三宮胃腸内科
slug: sannomiya-clinic
```

既存リポジトリの質問内容・デザインを参考にシードデータ化する。

将来的に瓦谷クリニック、SANGLIERも移行可能な構造とする。

---

## 33. 管理画面UI

営業担当者向けのため、DBや開発用語を画面に出さない。

例：

```text
survey_versions → 表示しない
published_config → 表示しない
```

画面では以下のような自然な言葉を使用する。

```text
下書き
プレビュー
公開
非公開
回答を見る
複製
```

---

## 34. 管理画面ルート

最低限以下と同等の機能を持つ。

```text
/admin
/admin/surveys
/admin/surveys/new
/admin/surveys/[id]
/admin/surveys/[id]/questions
/admin/surveys/[id]/design
/admin/surveys/[id]/preview
/admin/surveys/[id]/responses
```

URL構造は実装上より適切であれば変更してよい。

---

## 35. 複製機能

営業運用上重要。

既存アンケートを複製して新規案件を作成できるようにする。

例：

```text
三宮胃腸内科を複製
↓
医院名を変更
↓
質問を一部修正
↓
プレビュー
↓
公開
```

将来的に「クリニック標準」「飲食店標準」「美容室標準」等のテンプレートへ発展可能にする。

---

## 36. 論理削除

営業担当者の誤操作で回答データが消えないよう、原則として即時物理削除は行わず `archived` 方式を採用する。

---

## 37. 監査情報

最低限以下を保持する。

- created_by
- updated_by
- created_at
- updated_at
- published_at

誰が変更・公開したか追跡可能にする。

---

## 38. エラーハンドリング

最低限以下を分かりやすく表示する。

- 保存失敗
- 公開失敗
- 回答送信失敗
- ネットワークエラー
- 権限エラー

エラー時に入力中の内容が不用意に消えないようにする。

---

## 39. アクセシビリティ

最低限以下を考慮する。

- label
- aria属性
- キーボード操作
- focus表示
- 十分なタップ領域
- 色だけに依存しない状態表現

---

## 40. 環境変数

最低限以下を想定する。

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

秘密情報はGitへコミットしない。

`.env.example` を用意する。

---

## 41. Production品質

最低限以下を実行し成功させる。

```text
npm test
npm run lint
npm run typecheck
npm audit
npm run build
```

`npm audit` は可能な限り `0 vulnerabilities` とする。

---

## 42. README

`platform/README.md` または適切なルートREADMEへ最低限以下を記載する。

- システム概要
- ローカル起動方法
- Supabase設定
- 環境変数
- DB migration
- 初期ユーザー作成
- ログイン方法
- アンケート作成方法
- プレビュー方法
- 公開方法
- 回答確認
- CSV出力
- Vercelデプロイ方法

---

## 43. MVP完成条件

以下が一連で実行できればMVP完成とする。

```text
営業マンログイン
↓
アンケート一覧
↓
新規作成
↓
基本情報入力
↓
質問追加
↓
質問編集
↓
質問並び替え
↓
デザイン設定
↓
下書き保存
↓
プレビュー
↓
公開
↓
/s/[slug] で公開
↓
回答送信
↓
Supabase保存
↓
回答一覧
↓
CSV出力
```

---

## 44. 推奨実装Phase

### Phase 1

`platform/` プロジェクト初期構築

### Phase 2

Supabase schema / migration / RLS

### Phase 3

Authentication / Role

### Phase 4

管理画面レイアウト

### Phase 5

アンケートCRUD

### Phase 6

質問Builder

### Phase 7

Design設定

### Phase 8

Draft / Preview / Publish

### Phase 9

公開アンケートRenderer

### Phase 10

回答保存

### Phase 11

回答一覧 / CSV

### Phase 12

水谷眼科・三宮胃腸内科のシードデータ

### Phase 13

テスト / セキュリティ / README

### Phase 14

Vercel公開

---

## 45. 禁止事項

- 店舗ごとに新しいGitHubリポジトリを作る
- 店舗ごとにVercel Projectを作る
- 質問変更のたびに再デプロイを必須にする
- Service Role Keyをブラウザへ露出する
- 秘密情報をGitへコミットする
- 点数によってGoogle口コミCTAを選別する
- 高得点回答者だけGoogle口コミへ誘導する
- 既存の参考リポジトリを破壊・変更する
- 営業担当者へGitHub・Codex・Vercel操作を要求する

---

## 46. 最終方針

`questionnaire-system-builder` は今後、単なる「個別アンケートを生成するための仕様書」ではなく、以下の両方を管理する正本リポジトリとする。

```text
1. アンケート制作の共通ルール・仕様
2. 営業担当者向けQuestionnaire Platform本体
```

最終的には、営業担当者が管理画面から新規案件を複製・編集・公開でき、開発担当者が案件ごとに個別実装しなくても運用できる状態を目指す。
