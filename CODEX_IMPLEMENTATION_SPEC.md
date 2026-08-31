# Questionnaire Platform — Codex Implementation Specification

## 0. このドキュメントの目的

この仕様書は、Codex にそのまま渡して実装を進めるための実装要件書です。

現在は店舗ごとにアンケートシステムのリポジトリを複製しているが、今後はこれを廃止し、**1つの共通アンケート基盤 + 管理画面 + 店舗ごとの設定データ**で運用する。

最終目標は、非エンジニアが GitHub / Vercel / VS Code / ターミナル / GAS を直接触らずに、管理画面だけで以下を完結できる状態にすること。

- 新しい店舗アンケートを作成
- 質問項目を追加・編集・削除・並び替え
- 必須 / 任意を変更
- 評価形式を変更
- 店舗名・ロゴ・ブランドカラーを変更
- Google口コミURLを設定
- スマホプレビューを確認
- 下書き保存
- 公開 / 非公開
- 公開URLを取得
- QRコードを取得
- 回答一覧を閲覧
- CSV出力

システム本体のコード変更がない限り、店舗追加や質問変更では再デプロイを必要としないこと。

---

# 1. 既存参考実装

以下を既存仕様・UI・口コミ導線の参考にする。

## 現行の飲食店向け参考

```text
https://github.com/hiroyukimaekawa-lang/sangrier-ques-system
```

## 旧参考

```text
https://github.com/hiroyukimaekawa-lang/kawaratani-clinic-questionnaire
```

既存リポジトリを直接壊さず、新しい共通基盤として別リポジトリで実装すること。

---

# 2. 実装対象の新システム

仮称:

```text
questionnaire-platform
```

推奨リポジトリ名:

```text
hiroyukimaekawa-lang/questionnaire-platform
```

リポジトリが存在しない場合は、実装開始時点ではローカルに完成版を作成し、GitHub作成は別工程でもよい。

---

# 3. 技術スタック

原則以下を採用する。

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
  - PostgreSQL
  - Auth
  - Storage
- Vercel
- QRコード生成ライブラリ

状態管理は必要最小限とし、React標準機能を優先する。

フォーム管理ライブラリは必須ではない。複雑化する場合のみ React Hook Form + Zod を使用してよい。

---

# 4. 最重要設計方針

## 4.1 店舗ごとにコードを複製しない

NG:

```text
sanglier-ques-system
store-b-ques-system
store-c-ques-system
```

OK:

```text
questionnaire-platform
  ├─ 共通UI
  ├─ 共通ロジック
  └─ DB
      ├─ SANGLIER設定
      ├─ 店舗B設定
      └─ 店舗C設定
```

## 4.2 店舗追加・質問変更はDB更新だけで完結

店舗設定や質問項目の変更はSupabaseへ保存し、公開画面はDBから動的に読み込む。

店舗作成・編集のたびにGit commitやVercel deployを発生させない。

## 4.3 モバイルファースト

利用者向けアンケート画面は原則スマホ利用のみを想定する。

基準幅:

```text
375px〜430px
```

横スクロールを発生させない。

## 4.4 Google口コミ導線

スコアによってGoogle口コミ導線の表示可否を分岐しない。

全回答者に同一条件でGoogle口コミ導線を表示する。

回答者本人が自由記述を入力した場合のみ、その文章をコピーしてGoogle口コミ画面へ移動できる。

店舗側が好意的な口コミ文章を自動生成して投稿させる仕様にはしない。

---

# 5. ユーザー種別

## 5.1 管理者

社内運用者。

できること:

- ログイン
- 店舗一覧を見る
- 店舗を新規作成
- 店舗設定編集
- アンケート編集
- 公開 / 非公開
- 回答閲覧
- CSV出力
- QRコード取得

初期版では権限階層は1種類でよい。

将来的に以下を追加可能な設計にしておく。

- super_admin
- editor
- viewer

## 5.2 一般回答者

ログイン不要。

公開URLからアンケートへ回答できる。

---

# 6. URL設計

## 管理画面

```text
/admin/login
/admin
/admin/stores/new
/admin/stores/[id]
/admin/stores/[id]/questions
/admin/stores/[id]/design
/admin/stores/[id]/responses
```

## 公開アンケート

```text
/q/[slug]
/q/[slug]/thanks
```

例:

```text
/q/sanglier
/q/abc-cafe
```

店舗slugは一意。

---

# 7. 管理画面UI

## 7.1 店舗一覧

表示項目:

- 店舗名
- 業種
- 公開状態
- slug
- 最終更新日
- 回答件数

操作:

- 編集
- プレビュー
- 公開URLコピー
- QRコード
- 回答を見る
- 公開 / 非公開

上部に:

```text
+ 新しいアンケートを作成
```

ボタンを設置。

---

# 8. 新規作成フロー

非エンジニアが迷わないウィザード形式にする。

## Step 1 基本情報

入力項目:

- 店舗名
- 業種
- slug
- GoogleマップURL
- Google口コミ投稿URL
- 公式サイトURL（任意）

slugは店舗名から自動生成するが編集可能。

## Step 2 質問

業種テンプレートを選択可能。

選択肢:

- 飲食店
- 美容室 / サロン
- クリニック
- 完全カスタム

テンプレート選択時に初期質問を生成。

## Step 3 デザイン

入力:

- ロゴ
- メインカラー
- サブカラー
- 背景色
- ボタン色

可能であれば公式サイトURLから将来的にAI抽出できる構造にするが、Phase 1では手動設定でよい。

## Step 4 プレビュー

右側または下部にスマホフレームで表示。

実際の公開画面と同じレンダラーを使用し、管理画面用の別UIを作らない。

## Step 5 公開

ボタン:

```text
下書き保存
公開する
```

公開後:

- 公開URL表示
- URLコピーボタン
- QRコード表示
- QRコードPNGダウンロード

---

# 9. 質問ビルダー

質問は完全にDB駆動にする。

## 対応する質問タイプ

Phase 1:

1. `single_choice`
2. `score_10`
3. `textarea`

Phase 2で追加可能:

4. `score_5`
5. `multi_choice`
6. `text`
7. `nps`

## 質問ごとの設定

- 質問文
- type
- required
- sort_order
- placeholder
- min_label
- max_label
- options
- active

## 管理画面操作

- 質問追加
- 質問削除
- 質問編集
- 必須ON/OFF
- ドラッグ&ドロップで並び替え

---

# 10. 標準質問テンプレート

## 飲食店

1. 本日はどのようにご利用いただきましたか？
   - single_choice
   - 必須
   - カフェ利用 / お食事 / スイーツ / テイクアウト / その他

2. お料理・ドリンクはいかがでしたか？
   - score_10
   - 必須
   - 左: 非常に不満
   - 右: 非常に満足

3. スタッフの接客はいかがでしたか？
   - score_10
   - 必須

4. 店内の雰囲気・居心地はいかがでしたか？
   - score_10
   - 必須

5. 当店をどこで知りましたか？
   - single_choice
   - Google検索・Googleマップ / Instagram / 知人・友人からの紹介 / 通りがかり / 以前から知っていた / その他

6. 本日のご利用について、率直なご感想をお聞かせください。
   - textarea
   - 任意

---

# 11. 公開アンケートUI

## 共通

- 最大幅 430px
- 左右padding 16px
- 背景は店舗設定を反映
- 1画面内で読みやすい余白
- ボタンは指で押しやすいサイズ

## 質問見出し

例:

```text
②お料理・ドリンクはいかがでしたか ※必須
```

必須は赤文字。

## score_10 UI

スマホで横スクロールなし。

```text
1 2 3 4 5 6 7 8 9 10
←────────────────→
非常に不満          非常に満足
```

要件:

- 円形アウトライン
- 選択値をブランドカラーで強調
- 未選択はグレー
- 選択値はaria属性でアクセシブルに

---

# 12. 回答送信

送信時に以下をDBへ保存。

```text
store_id
questionnaire_id
submitted_at
user_agent（任意）
```

各回答は別テーブルで保持。

```text
response_id
question_id
value_text
value_number
value_json
```

自由記述をサンクス画面で再利用するため、送信完了後に該当値をsessionStorageへ一時保存してよい。

個人情報をURL query paramsへ載せない。

---

# 13. サンクス画面

標準文言:

```text
ご回答ありがとうございました。
いただいたご意見は、今後より良いお店づくりに活用させていただきます。

よろしければ、Googleでもご感想をお聞かせください。
```

## 自由記述あり

自由記述をカード内に表示。

ボタン:

```text
感想をコピーしてGoogleクチコミへ
```

動作:

1. clipboardへコピー
2. コピー成功を表示
3. Google口コミ投稿URLを開く

## 自由記述なし

```text
Googleクチコミを書く
```

のみ表示。

## 重要

回答スコアによる口コミ導線の分岐は禁止。

---

# 14. Supabase DB設計

最低限以下を作成する。

## profiles

```sql
id uuid primary key references auth.users(id)
role text default 'admin'
created_at timestamptz
```

## stores

```sql
id uuid primary key
name text not null
slug text unique not null
industry text
website_url text
google_maps_url text
google_review_url text
logo_url text
primary_color text
secondary_color text
background_color text
button_color text
status text check (status in ('draft','published','archived'))
created_at timestamptz
updated_at timestamptz
```

## questionnaires

```sql
id uuid primary key
store_id uuid references stores(id) on delete cascade
name text
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

初期版では1店舗1questionnaireでよいが、将来的に複数アンケートを持てる構造にする。

## questions

```sql
id uuid primary key
questionnaire_id uuid references questionnaires(id) on delete cascade
label text not null
type text not null
required boolean default false
sort_order integer not null
placeholder text
min_label text
max_label text
options jsonb
active boolean default true
created_at timestamptz
updated_at timestamptz
```

## responses

```sql
id uuid primary key
store_id uuid references stores(id)
questionnaire_id uuid references questionnaires(id)
submitted_at timestamptz default now()
metadata jsonb
```

## response_answers

```sql
id uuid primary key
response_id uuid references responses(id) on delete cascade
question_id uuid references questions(id)
value_text text
value_number numeric
value_json jsonb
created_at timestamptz
```

---

# 15. RLS

## 管理系

認証済みadminのみCRUD可能。

## 公開アンケート

匿名ユーザー:

- published店舗の設定READのみ
- active質問READのみ
- responses INSERT可能
- response_answers INSERT可能

匿名ユーザーは過去回答をSELECTできない。

RLS SQLもリポジトリへ含めること。

---

# 16. 認証

Supabase Authを使用。

Phase 1:

- Email + Password または Magic Link

管理画面は未認証時 `/admin/login` へredirect。

---

# 17. ロゴアップロード

Supabase Storageを使用。

bucket:

```text
questionnaire-assets
```

管理画面からロゴ画像をアップロード可能。

対応形式:

- PNG
- JPG
- WEBP

最大ファイルサイズは5MB程度。

---

# 18. QRコード

公開URLからQRコードを生成。

要件:

- 管理画面で表示
- PNGとしてダウンロード可能
- URL変更時は自動更新

---

# 19. 回答管理

`/admin/stores/[id]/responses`

表示:

- 回答日時
- 各質問の回答
- 平均スコア（score系が複数ある場合）

機能:

- ページネーション
- CSV出力

初期版では高度なグラフは不要。

---

# 20. CSV出力

1回答 = 1行。

例:

```text
回答日時,利用方法,料理,接客,雰囲気,認知経路,自由記述
```

質問変更後も可能な限り現在の質問ラベルをヘッダーに使用する。

---

# 21. 公開・非公開

store.statusで制御。

## draft

公開URLへアクセス時404または「現在公開されていません」。

## published

回答可能。

## archived

回答不可。

管理画面でワンクリック切替可能。

---

# 22. プレビュー

管理画面の編集内容を保存前でも確認できるプレビューを実装する。

推奨:

- 編集フォーム + 右側スマホプレビュー（PC）
- スマホ管理画面では「プレビュー」タブ切替

公開画面と同じコンポーネントを利用する。

---

# 23. デプロイ設計

## システム本体

GitHub mainへmergeされたときのみVercel自動デプロイ。

## 店舗データ変更

Supabaseデータを更新するだけ。

店舗作成 / 質問編集 / 色変更 / Google口コミURL変更ではVercel再デプロイ不要。

---

# 24. 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Service Role Keyはserver-sideのみ。

絶対にclient componentへ露出させない。

`.env.local` はGit管理外。

`.env.example` を作成。

---

# 25. 推奨ディレクトリ構成

```text
app/
  admin/
    login/
    stores/
      new/
      [id]/
        questions/
        design/
        responses/
  q/
    [slug]/
      page.tsx
      thanks/
        page.tsx
  api/
    responses/
    export/
components/
  admin/
  questionnaire/
lib/
  supabase/
  questionnaire/
types/
supabase/
  migrations/
  seed.sql
public/
```

---

# 26. コンポーネント設計

公開アンケート側は最低限以下に分割。

```text
QuestionnaireRenderer
QuestionCard
SingleChoiceQuestion
Score10Question
TextareaQuestion
SurveySubmitButton
ThankYouPanel
ReviewCopyButton
```

管理画面:

```text
StoreForm
QuestionBuilder
QuestionEditor
QuestionSortableList
DesignEditor
MobilePreview
PublishControls
QRCodePanel
ResponsesTable
```

---

# 27. SANGLIER移行

初期seedとしてSANGLIER設定を登録できるようにする。

店舗:

```text
SANGLIER（サングリエ）
```

質問:

1. 本日はどのようにご利用いただきましたか？
2. お料理・ドリンクはいかがでしたか？
3. スタッフの接客はいかがでしたか？
4. 店内の雰囲気・居心地はいかがでしたか？
5. SANGLIERをどこで知りましたか？
6. 本日のご利用について、率直なご感想をお聞かせください。

評価は1〜10。

デザインは既存 `sangrier-ques-system` を参考にする。

Google口コミURLは既存設定を参照するが、ハードコードではなくseedデータへ格納する。

---

# 28. Phase 1で実装しないもの

以下は今回の初期実装対象外。

- OpenAI APIによる自動質問生成
- HPからブランドカラー自動取得
- 複雑な権限管理
- Slack通知
- LINE連携
- Google Sheets自動同期
- 高度なBIダッシュボード
- 多言語
- 店舗オーナー自身へのログイン権限

ただし将来追加しやすい設計にする。

---

# 29. Phase 2予定

将来追加予定:

## AI作成

管理画面で:

```text
店舗名
業種
公式サイトURL
GoogleマップURL
```

を入力して「AIで作成」を押す。

AIが提案:

- 質問項目
- 選択肢
- 店舗紹介文
- デザインカラー

人間が確認後に保存。

## ChatGPT / Builder連携

最終的に以下の入力だけで作成可能にする。

```text
questionnaire-system-builderで作成
店舗名: ○○
業種: 飲食店
Googleマップ: https://...
質問: お任せ
```

Builderはコード生成ではなく、共通基盤のAPI / DBへ店舗設定を登録する役割に変更する。

---

# 30. エラー処理

最低限:

- slug重複
- Google口コミURL未設定
- 必須質問なし
- 質問0件での公開
- 回答送信失敗
- ネットワークエラー
- Storage upload失敗

ユーザー向けエラーは日本語で表示。

---

# 31. バリデーション

店舗公開時に以下をチェック。

必須:

- 店舗名
- slug
- Google口コミURL
- 質問1件以上

質問ごと:

- label必須
- type必須
- single_choiceはoptionsが2件以上
- score_10はmin/max label任意

---

# 32. アクセシビリティ

- button要素を使用
- radio相当UIはaria-checkedを付ける
- textareaにlabelを持たせる
- 色だけで選択状態を表現しない
- focus-visibleを確保

---

# 33. SEO / 公開画面metadata

店舗ごとに動的metadata。

```text
{店舗名} お客様アンケート
```

noindexを推奨。

```text
robots: noindex, nofollow
```

アンケートURLを検索結果へ出す必要はない。

---

# 34. テスト要件

## Unit / component

最低限:

- score_10選択
- single_choice選択
- required validation
- textarea入力
- config反映

## E2E相当

手動またはPlaywrightで以下を確認。

### 公開アンケート

1. `/q/sanglier` を開く
2. 必須未入力で送信できない
3. 全回答入力
4. 送信
5. DB保存
6. thanksへ遷移
7. 自由記述再表示
8. コピー成功
9. Google口コミURLへ遷移

### 管理画面

1. ログイン
2. 新規店舗作成
3. 質問追加
4. 並び替え
5. 色変更
6. プレビュー反映
7. 公開
8. URL生成
9. QR生成
10. 回答確認
11. CSV出力

---

# 35. Definition of Done

以下をすべて満たしたらPhase 1完成。

- [ ] 管理者ログイン可能
- [ ] 店舗新規作成可能
- [ ] 店舗基本情報編集可能
- [ ] 質問追加・編集・削除可能
- [ ] 並び替え可能
- [ ] 10段階評価対応
- [ ] 単一選択対応
- [ ] 自由記述対応
- [ ] ブランドカラー変更可能
- [ ] ロゴ変更可能
- [ ] スマホプレビュー可能
- [ ] 下書き保存可能
- [ ] 公開 / 非公開可能
- [ ] `/q/[slug]` で公開
- [ ] 回答をSupabase保存
- [ ] thanks画面表示
- [ ] 自由記述コピー可能
- [ ] Google口コミ画面へ遷移
- [ ] QRコード発行可能
- [ ] 回答一覧確認可能
- [ ] CSV出力可能
- [ ] 375pxで崩れない
- [ ] 430pxで崩れない
- [ ] RLS設定済み
- [ ] READMEあり
- [ ] `.env.example`あり
- [ ] SANGLIER seedあり

---

# 36. Codexへの実装指示

この仕様書を読み、以下の順で進めること。

1. 既存 `sangrier-ques-system` を調査
2. 共通化できるUI・ロジックを特定
3. 新規 `questionnaire-platform` を設計
4. Supabase schema / migrations作成
5. 公開アンケート画面実装
6. 管理画面実装
7. SANGLIER seed作成
8. 回答保存実装
9. サンクス・Google口コミ導線実装
10. QR / CSV実装
11. RLS実装
12. テスト
13. README作成
14. ローカルで動作確認

途中で軽微なUI判断が必要な場合は、上記要件を優先し合理的に判断して進めてよい。

ただし以下は勝手に変更しないこと。

- スコアでGoogle口コミ導線を分岐しない
- モバイルファースト
- 店舗ごとにリポジトリを複製しない
- 店舗設定変更で再デプロイを必要としない
- 秘密情報をGitへ入れない

実装前に `IMPLEMENTATION_PLAN.md` を作成し、ファイル構成・DB設計・実装順序を記載すること。

その後、実装・テストまで一気に進めること。
