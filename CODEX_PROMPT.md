# Codex実行用プロンプト

以下をCodexへそのまま渡してください。

```text
# 指示

以下のリポジトリにある要件書を正として、新しい共通アンケートプラットフォームを設計・実装してください。

要件リポジトリ:
https://github.com/hiroyukimaekawa-lang/questionnaire-system-builder

必ず最初に以下を読んでください。

- CODEX_IMPLEMENTATION_SPEC.md
- SKILL.md
- USAGE.md

また、現在運用中の参考実装として以下を調査してください。

- https://github.com/hiroyukimaekawa-lang/sangrier-ques-system
- https://github.com/hiroyukimaekawa-lang/kawaratani-clinic-questionnaire

## ゴール

店舗ごとにアンケート用リポジトリを複製する現在の方式を廃止し、

「1つの共通アンケート基盤 + 管理画面 + Supabase上の店舗設定データ」

へ移行してください。

最終的には非エンジニアがGitHub、Vercel、VS Code、ターミナル、GASを触らずに、管理画面だけで以下を完結できることを目標とします。

- 新規店舗作成
- 質問編集
- 質問追加・削除・並び替え
- 必須/任意変更
- デザイン変更
- Google口コミURL設定
- スマホプレビュー
- 下書き保存
- 公開/非公開
- URL発行
- QRコード発行
- 回答確認
- CSV出力

店舗追加や質問変更のたびに再デプロイする設計は禁止です。

## 技術方針

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- モバイルファースト

詳細はCODEX_IMPLEMENTATION_SPEC.mdを厳守してください。

## 実装手順

1. 既存2リポジトリを調査する
2. CODEX_IMPLEMENTATION_SPEC.mdを読む
3. 実装開始前に `IMPLEMENTATION_PLAN.md` を作る
4. DBスキーマとRLSを設計する
5. 共通公開アンケート画面を実装する
6. 管理画面を実装する
7. SANGLIERをseedデータとして移行する
8. 回答保存を実装する
9. Google口コミ導線を実装する
10. QRコードを実装する
11. CSV出力を実装する
12. テストする
13. READMEを作成する
14. ローカル動作確認まで行う

途中確認は原則不要です。

軽微なUI・実装判断は要件に反しない範囲で合理的に決めて進めてください。

## 絶対条件

- スコアによってGoogle口コミへの導線を出し分けない
- 375〜430pxのスマホで崩れない
- 店舗ごとにリポジトリを作らない
- 店舗設定変更でVercel再デプロイを必要としない
- APIキーや秘密情報をGitへコミットしない
- Supabase Service Role Keyをクライアントへ露出しない
- 匿名回答者が他人の回答を読み取れないRLSにする
- 既存SANGLIERリポジトリを直接壊さない

## 完了条件

CODEX_IMPLEMENTATION_SPEC.md の `Definition of Done` をすべて満たしてください。

完了後は以下を報告してください。

1. 実装した機能
2. 作成・変更した主要ファイル
3. DBテーブル
4. RLS内容
5. ローカル起動方法
6. Supabase初期設定方法
7. Vercelデプロイ方法
8. 未完了項目があればその内容
9. 次に人間側で必要な作業
```
