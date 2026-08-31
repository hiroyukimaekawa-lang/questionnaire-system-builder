# Questionnaire Platform｜Codex実装指示

以下の内容に従い、`questionnaire-system-builder` リポジトリ内へ営業担当者向けWebアプリケーションを実装してください。

## 最初に読むもの

必ず以下を最初から最後まで確認してください。

- `SKILL.md`
- `USAGE.md`
- `CODEX_IMPLEMENTATION_SPEC.md`
- `CODEX_PROMPT.md`
- `PLATFORM_REQUIREMENTS.md`

また、ローカルに存在する場合は以下を参考実装として調査してください。

- `kawaratani-clinic-questionnaire`
- `mizutani-eye-questionnaire`
- `sannomiya-clinic-questionnaire`
- `sangrier-ques-system`

参考実装側には変更を加えないでください。

---

## 実装対象

新しい別リポジトリは作成しないでください。

実装対象はこのリポジトリ内の以下です。

```text
questionnaire-system-builder/platform/
```

既存の仕様書ファイルは破壊しないでください。

---

## 目的

営業担当者がGitHub、Codex、Vercel、ターミナル、ソースコードを触ることなく、ブラウザ上の管理画面だけで以下を行えるマルチテナント型アンケートプラットフォームを構築してください。

```text
ログイン
↓
アンケート一覧
↓
新規作成 / 複製
↓
店舗・医院情報編集
↓
質問編集
↓
デザイン編集
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
回答一覧 / CSV
```

---

## 技術構成

原則として以下を使用してください。

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel

回答データの正本はSupabaseです。

Google Sheets / GASは初期MVPの必須要件ではありません。

---

## 必須機能

最低限以下を実装してください。

1. 営業担当者ログイン
2. Admin / Sales権限
3. アンケート一覧
4. 新規アンケート作成
5. 既存アンケート複製
6. 店舗・医院基本情報編集
7. slug設定
8. メインカラー設定
9. ロゴ / アイコン
10. 冒頭文章
11. 匿名説明文
12. 完了画面文章
13. Google口コミURL
14. 質問追加
15. 質問削除
16. 質問編集
17. 質問並び替え
18. 必須 / 任意
19. 単一選択
20. 複数選択
21. 1〜10評価
22. 自由記述
23. 短文入力
24. 下書き保存
25. プレビュー
26. 公開
27. 非公開
28. `/s/[slug]` 公開URL
29. 回答送信
30. Supabase回答保存
31. 回答一覧
32. CSV出力
33. 論理削除
34. created_by / updated_by / published_at等の監査情報
35. Supabase RLS

---

## 最重要ルール

編集しただけで現在公開中のアンケートを変更してはいけません。

必ず以下の流れにしてください。

```text
編集
↓
下書き保存
↓
プレビュー
↓
公開
```

DraftとPublishedを安全に分離してください。

`survey_versions` 方式を推奨しますが、より安全な設計があれば改善して構いません。

---

## 公開設計

店舗ごとにGitHubリポジトリやVercel Projectを作る設計は禁止です。

1つのプラットフォームから、例えば以下を公開してください。

```text
/s/mizutani-eye
/s/sannomiya-clinic
/s/sanglier
/s/任意のslug
```

店舗追加・質問変更・色変更・文章変更のたびにVercel再デプロイを要求してはいけません。

DBの下書きを編集し、「公開」操作を行うことで本番へ反映する設計にしてください。

---

## Google口コミCTA

Google口コミURLが設定されている場合は、回答完了画面にGoogle口コミCTAを表示してください。

点数によってGoogle口コミCTAを表示・非表示にする機能は禁止です。

高得点回答者だけGoogle口コミへ誘導してはいけません。

口コミURL設定時は全回答者へ同条件で表示してください。

低評価者向け改善メッセージは口コミCTAとは独立して実装可能です。

---

## モバイル要件

アンケート回答画面はスマートフォンを最優先にしてください。

最低限以下で崩れないことを確認してください。

```text
375px
390px
430px
```

1〜10評価は375pxでも横一列表示し、横スクロールさせないでください。

管理画面はPC利用を基本としつつ、タブレットでも最低限利用可能にしてください。

---

## Supabase

Supabase migrationをリポジトリ内で管理してください。

最低限以下の概念を持たせてください。

```text
profiles
surveys
survey_versions
questions
question_options
responses
response_answers
```

必要であればJSONBとの併用など、より適切な設計へ改善して構いません。

Supabase RLSを必ず設計・実装してください。

Service Role Keyはブラウザへ露出させないでください。

---

## 環境変数

最低限以下を想定してください。

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

架空値や秘密情報をコミットしないでください。

`.env.example` を作成してください。

---

## 初期データ

既存実装を参考に、最低限以下をシードデータとして投入可能にしてください。

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

質問内容・表示については既存リポジトリを参照してください。

---

## 最初に作成するもの

実装開始前に、まず以下を作成してください。

```text
platform/IMPLEMENTATION_PLAN.md
```

最低限以下を記載してください。

- 現状調査
- 既存仕様との関係
- アプリ構成
- DB設計
- Supabase migration設計
- RLS設計
- 認証 / 権限設計
- Draft / Preview / Publish設計
- URL設計
- 質問Builder設計
- 公開Renderer設計
- 回答保存設計
- CSV設計
- シードデータ設計
- セキュリティ設計
- 実装Phase
- テスト計画

計画書を作った後は確認待ちにせずMVP完成まで進めてください。

---

## 推奨実装順序

```text
Phase 1  platform/ 初期構築
Phase 2  Supabase schema / migration / RLS
Phase 3  Authentication / Role
Phase 4  管理画面
Phase 5  アンケートCRUD
Phase 6  質問Builder
Phase 7  デザイン設定
Phase 8  Draft / Preview / Publish
Phase 9  公開アンケートRenderer
Phase 10 回答保存
Phase 11 回答一覧 / CSV
Phase 12 水谷眼科・三宮胃腸内科シード
Phase 13 テスト / README / セキュリティ監査
```

---

## テスト

実装完了後、最低限以下を実行してください。

```text
npm test
npm run lint
npm run typecheck
npm audit
npm run build
```

可能な限り `npm audit` は `0 vulnerabilities` にしてください。

さらに以下も確認してください。

- 未ログイン時の管理画面保護
- Admin / Sales権限
- 下書き保存しても公開版が変わらない
- 公開後のみ公開版が更新される
- 非公開アンケートへアクセスできない
- 必須Validation
- 二重送信防止
- 375 / 390 / 430px
- Google口コミCTAが点数に依存していない
- 回答保存
- CSV出力
- RLS

---

## README

`platform/README.md` を日本語で作成してください。

最低限以下を記載してください。

- システム概要
- ローカル起動方法
- Supabase準備
- migration方法
- 環境変数
- 初期ユーザー作成
- Admin / Sales
- アンケート作成
- 複製
- 下書き
- プレビュー
- 公開
- 回答一覧
- CSV
- Vercel公開

---

## 禁止事項

- 新しい別リポジトリを作成する
- 店舗ごとにGitHubリポジトリを作成する
- 店舗ごとにVercel Projectを作成する
- 既存仕様書を削除する
- 既存参考リポジトリを変更する
- 秘密情報をコミットする
- 架空Supabase URLを設定する
- 点数によるGoogle口コミCTA選別
- 高得点回答者だけ口コミへ誘導する
- 営業担当者へGitHub / Codex / Vercel操作を要求する

---

## MVP完成条件

以下が一連で動作すればMVP完成です。

```text
営業担当者ログイン
↓
アンケート一覧
↓
新規作成または複製
↓
基本情報編集
↓
質問追加・編集・並び替え
↓
デザイン設定
↓
下書き保存
↓
プレビュー
↓
公開
↓
/s/[slug]で閲覧
↓
回答
↓
Supabase保存
↓
回答一覧
↓
CSVダウンロード
```

MVP完成まで進めてください。
