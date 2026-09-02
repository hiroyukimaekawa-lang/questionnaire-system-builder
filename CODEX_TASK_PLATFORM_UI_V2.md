# Questionnaire Platform UI / System V2 実装タスク

## 対象

Repository:
hiroyukimaekawa-lang/questionnaire-system-builder

主対象:
platform/

既存のSANGLIER等の公開済みアンケートを壊さず、管理画面・Question Builder・公開アンケートUI・回答後処理を拡張する。

既存のSKILL.mdおよびSURVEY_DESIGN_SKILL.mdも今回確定仕様に合わせて更新する。

## 絶対条件

- Next.js App Router / TypeScript / Supabase / Cloudflare構成を維持する
- 既存公開アンケートとの後方互換性を維持する
- canonical public URL は /{slug}
- /s/{slug} はlegacy redirectのみ
- NEXT_PUBLIC_APP_URL をURL生成元として使用する
- crestix-questionnaire.pages.dev をコードへ直接ハードコードしない
- .env.local、秘密情報、APIキーをコミットしない
- Google口コミCTAをスコアによって表示・非表示に分岐しない
- Google口コミCTAを有効化した場合は全回答者に同じ条件で表示する
- 高評価者だけ口コミへ誘導するレビューゲーティングは実装しない
- 低評価者だけ口コミ導線を隠す実装もしない
- 特定店舗専用の条件分岐やCSSを作らない
- SANGLIER専用実装にしない
- mobile first
- 375 / 390 / 430pxで公開画面を確認する

# 1. 公開アンケートUI

既存SURVEY_DESIGN_SKILL.mdを基準にする。

参考デザインの方向性:

- 白背景中心
- ブランドヘッダー
- ブランドカラーのヒーロー
- QUESTIONNAIRE
- メインタイトル
- 短い装飾ライン
- サブタイトル
- 匿名案内
- 質問間を広い余白で区切る
- 質問全体を巨大なカードで囲まない
- 選択肢単位を白カードにする
- pill型の大きな送信ボタン

survey-hero-inner:

QUESTIONNAIRE
↓
h1
↓
装飾ライン
↓
p

h1とサブタイトルpは原則一行表示。

文字数が長い場合:
- 改行ではなくfont-sizeを自動縮小
- 日本語と英数字の文字幅差をある程度考慮
- overflowさせない
- 最低フォントサイズを設定
- 375pxでも横にはみ出さない

既存のheroFontSize等があれば再利用・改善する。

# 2. 質問タイトル

公開画面は以下。

①本日のご来院目的を教えてください。 ※必須

- 1〜20問程度は丸数字
- requiredの場合は同一タイトル行に赤系で「※必須」
- 質問番号・タイトル・必須表示の視認性を上げる
- 外側の大きなquestion-card枠は原則なくす

# 3. 質問形式

営業・管理者側には以下の日本語UIだけを見せる。

- 短文テキスト
- 長文テキスト
- ラジオボタン
- チェックボックス
- プルダウン
- スコアリング

既存DB互換性を優先する。

内部表現は可能なら:

短文:
type=text

長文:
type=textarea

ラジオ:
type=single_choice
settings.presentation=radio

プルダウン:
type=single_choice
settings.presentation=select

チェックボックス:
type=multiple_choice

スコア:
既存rating_10を互換維持して使用し、
settings.maxScore = 5 | 10
を追加する。

既存rating_10でmaxScore未設定の場合は10として扱う。

QuestionTypeそのものを変更する必要がなければ変更しない。

# 4. スコアリング

管理画面:

回答形式
スコアリング

評価段階:
○ 5段階
○ 10段階

最低点ラベル:
非常に不満

最高点ラベル:
非常に満足

公開画面ではmaxScoreに応じて:

5段階:
1 2 3 4 5

10段階:
1 2 3 4 5 6 7 8 9 10

を丸型で一列表示する。

375〜430pxで横スクロール禁止。

既存の10点アンケートはそのまま10点として表示する。

# 5. ラジオ / チェック / プルダウン

管理画面から選択肢を:

- 追加
- 削除
- 編集
- 並び替え

できること。

ラジオ:
単一選択カード

チェック:
複数選択カード

プルダウン:
select UI

として公開画面に描画する。

# 6. 必須 / 任意

Question Builder上で:

回答設定
● 必須
○ 任意

を分かりやすく表示。

公開画面ではrequired時のみ
「※必須」
をタイトル横に表示する。

# 7. 管理画面の公開URL

現在のアンケート一覧へ「公開URL」情報を追加する。

publishedの場合:

https://{NEXT_PUBLIC_APP_URL}/{slug}

をベースに、

- 公開ページを開く
- URLをコピー

を提供。

UI上は長いURLをそのまま巨大表示しなくてよい。
短縮表示 + 開く + コピーでもよい。

draft / unpublishedの場合:
「未公開」または「—」。

URLは必ずlib/env.tsのappUrl()等、既存環境設定を利用する。

ハードコード禁止。

管理画面のアンケート詳細にも:

公開URL
[コピー]
[公開ページを開く]

を表示する。

レスポンシブ対応する。

# 8. Question Builder UI改善

現状の開発者向けUIを営業・管理者向けUIへ変更。

各質問カード:

質問 1

質問文
[　　　　　　　　　]

回答形式
[スコアリング ▼]

回答設定
● 必須
○ 任意

形式に応じた追加設定

[↑ 上へ] [↓ 下へ] [削除]

内部コード名
single_choice
multiple_choice
rating_10
等はユーザーへ見せない。

質問追加も:

＋ 質問を追加

→ 回答形式を選択

という自然なUIにする。

# 9. 作成内容確認画面

BuilderのShared Understanding / 作成内容確認で以下を確認可能にする。

店舗名
業種
目的
匿名
質問数

各質問:
- Q番号
- 質問文
- 回答形式
- 必須 / 任意
- 選択肢
- スコアなら5段階 / 10段階
- 最低点・最高点ラベル

Google口コミ:
- 使用しない
- 全回答者に表示

Google口コミURL:
- 未設定
- 設定済み

デザイン:
- Theme
- メインカラー

最後:
[この内容で作成]

# 10. Google口コミ設定

Google口コミ設定を管理画面で明示的に選択できるようにする。

Google口コミ導線:

○ 使用しない
○ 全回答者に表示

Google口コミURL:
[https://...]

既存configとの互換性:

- googleReviewMode未設定
- googleReviewUrlあり

なら
googleReviewMode='all'
として扱ってよい。

- URLなし
ならdisabled扱い。

必要ならSurveyConfigへ後方互換なoptional fieldを追加する。

例:
googleReviewMode?: 'disabled' | 'all'

重要:
スコア条件によるGoogle口コミCTAの表示・非表示は絶対に実装しない。

googleReviewMode='all'の場合、
得点・回答内容に関係なく全回答者へ同じCTAを表示する。

# 11. 回答後条件

Google口コミ表示条件とは分離して、
回答内容による条件判定機能を作る。

目的:
- サンクスメッセージの変更
- 要確認判定
- 改善フォロー対象

最低限以下の条件を扱える構造にする。

対象質問:
スコアリング質問

演算子:
- 以上
- 以下
- 等しい

値:
数値

例:
Q2 >= 8
Q3 <= 5

複数条件:
- AND
- OR

を扱えるデータ構造にする。

条件例:

Q2 >= 8 AND Q3 >= 8

Q2 <= 5 OR Q3 <= 5

初回実装では複雑すぎる汎用ルールエンジンにしなくてよい。
将来拡張可能な型と関数へ分離する。

例:

CompletionRule
RuleCondition
evaluateCompletionRules()

等。

# 12. 条件アクション

今回実装するアクション:

1. 通常完了
2. 条件別サンクスメッセージ
3. 要確認フラグ / follow-up判定

Google口コミCTAの表示可否はアクションに含めない。

例えば:

Q2 <= 5
↓
completionMessage:
「貴重なご意見ありがとうございます。いただいた内容はサービス改善に活用いたします。」

Q2 >= 8
↓
completionMessage:
「ご回答ありがとうございました。今後ともより良いサービスを提供してまいります。」

ただしgoogleReviewMode='all'の場合は
両方のサンクス画面に同一Google口コミCTAを表示する。

# 13. サンクスページ

回答送信時に必要な判定情報を安全にサンクスページへ引き継ぐ。

ユーザーがURL queryを書き換えるだけで不正な表示判定が起きない構造を優先。

既存sessionStorage利用部分との整合性を確認。

通常サンクスメッセージと条件別メッセージに対応。

Google口コミCTA:

disabled:
非表示

all:
すべての回答者に同一CTA

スコアによって変えない。

# 14. 回答保存

必要なら回答保存時に:

needsFollowUp
matchedRuleId

等を保存できる拡張を検討。

ただし不要なDB migrationは避ける。

既存responsesのmetadata/json等で安全に保持できるなら利用。

DB変更が必要なら:
- migrationを明示的に作る
- RLSを壊さない
-既存データを壊さない

# 15. Public URL

canonical:

/{slug}

/{slug}/thanks

legacy:

/s/{slug}
/s/{slug}/thanks

はredirect維持。

新しく生成するURLに/s/を使わない。

# 16. デザインSkill

SURVEY_DESIGN_SKILL.mdへ今回確定内容を追記。

必須事項:

- 375〜430px
- hero h1 / subtitle one-line auto-fit
- QUESTIONNAIRE
- decorative line
- question big outer cards無し
- 丸数字
- ※必須
- option cards
- 5 / 10 score UI
- pill submit
- Theme Token
- 特定店舗専用CSS禁止

# 17. システムSkill

SKILL.mdへ今回確定内容を追記。

含める:

- Public URL
- Question Builder
- text / textarea
- radio
- checkbox
- select
- score 5 / 10
- required
- options
- Google review disabled / all
- review gating禁止
- completion rules
- AND / OR
- conditional completion message
- follow-up flag
- backward compatibility
- mobile tests

# 18. テスト

既存テストを壊さず追加する。

最低限:

1. old rating_10 without maxScore => 10
2. maxScore=5 => 1〜5
3. maxScore=10 => 1〜10
4. single_choice presentation=radio
5. single_choice presentation=select
6. required validation
7. dropdown validation
8. 5点スコアvalidation
9. 10点スコアvalidation
10. public URL uses NEXT_PUBLIC_APP_URL + /slug
11. publishedのみ公開URL操作表示
12. googleReviewMode disabled
13. googleReviewMode all
14. googleReviewMode all is independent of score
15. review CTA is NOT hidden by score
16. single completion condition
17. AND condition
18. OR condition
19. conditional completion message
20. backward compatibility of old config
21. existing theme tests
22. existing builder tests
23. existing auth tests

可能ならDOMテストではなくpure functionへロジックを切り出してテストする。

# 19. 品質確認

実装完了後必ず:

npm test
npm run lint
npm run typecheck
npm run build

を実行。

すべて成功させる。

失敗した場合は原因を修正して再実行。

# 20. Git安全

Codex自身ではcommit/pushしない。

以下は触らない:
- .env.local
- secrets
- repo rootのsanglier-pages/
- unrelated untracked files

破壊的Git操作禁止。

git reset --hard
git clean
git add .
git add -A

は使用しない。

今回必要な実装とSkill更新だけ行う。

最後に:
- 変更ファイル一覧
- 実装内容
- テスト結果
- DB migration有無
- 残課題

を報告する。
