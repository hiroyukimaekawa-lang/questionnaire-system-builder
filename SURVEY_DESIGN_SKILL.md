---
name: questionnaire-public-ui-design
description: アンケート公開画面を、スマホで見やすく、清潔感があり、回答しやすいUIへ統一するためのデザインSkill。参考UIのレイアウト感を保ちつつ、クリニック・飲食店・サロンなど各ブランドの色と文言へ再利用する。
---

# Questionnaire Public UI Design Skill

## 必須併用Skill

日本語テキストを含む公開画面・プレビュー・サンクス画面を実装または修正する場合、必ず以下も同時に読む。

- `JAPANESE_WEB_TYPOGRAPHY_SKILL.md`

デザイン上1行に見せることよりも、日本語として自然に読めることを優先する。固定 `<br>` や `nowrap` によって文節・助詞・語尾を壊してはならない。

## 目的

アンケート公開画面を「フォームの集合」ではなく、店舗・クリニック・施設のブランド体験として見せる。

最優先は以下。

- 375〜430pxのスマホで読みやすい
- 質問の区切りが一目で分かる
- 選択肢が押しやすい
- 1〜10評価が横スクロールなしで一列に収まる
- 必須表示が質問文と同じ行で自然に見える
- ヒーローはブランド感を出しながら日本語の意味を崩さない
- サンクス画面まで自然な日本語組版を維持する
- 余白を十分に取り、カードを重ねすぎない
- 色は店舗ごとのTheme Tokenで変更し、特定店舗専用CSSを作らない

## デザイン基準

### 1. ページ全体

- mobile first
- 公開画面の基準幅は最大430px
- 背景は白〜ごく薄いブランド背景色
- 質問ごとの大きな外枠カードは原則使わない
- セクション間の余白で質問を分離する
- 余白は情報量よりも少し広めに取る
- 日本語本文には `line-break: strict` を基本とする
- `word-break: break-all` は使わない

推奨値:

```text
max-width: 430px
content padding: 20〜28px
question gap: 42〜50px
```

### 2. ブランドヘッダー

- 白背景
- ロゴまたはアイコン + 店舗・施設名を中央寄せ
- 高さは70〜80px程度
- ロゴを巨大化させない
- ロゴ未設定時もレイアウトが崩れない
- 店舗名・医院名を不自然に分断しない
- 長い名称は極端な `nowrap` ではなく、font-size / width / `word-break: auto-phrase` 等で自然に処理する

### 3. ヒーロー

構成は以下を標準とする。

```text
QUESTIONNAIRE
メインタイトル
短い装飾ライン
サブタイトル
```

- ブランドカラーを使った単色またはソフトグラデーション
- 白文字を基本
- h1は原則1〜2行、長い場合でも3行程度まで
- subtitleは意味のまとまりを優先し、必要なら自然に2〜3行へ折り返す
- 1行維持のためにfont-sizeを極端に小さくしない
- `white-space: nowrap` だけに頼らない
- 固定 `<br>` を最初の解決策にしない
- `text-wrap: balance` / `pretty` は補助として使い、実画面で確認する
- 対応ブラウザでは `word-break: auto-phrase` をprogressive enhancementとして利用してよい
- 文字が領域外へはみ出さないこと
- 英字ラベルはletter-spacingを広めにする

### 4. 導入・匿名表示

- 大きなカードには入れない
- 本文上部へ小さめの注意書きとして表示
- `※` を使った自然な説明を基本とする
- 匿名性や利用目的を簡潔に伝える
- 助詞や語尾が1〜2文字だけ孤立しないよう確認する

### 5. 質問タイトル

標準イメージ:

```text
①本日のご利用目的を教えてください。 ※必須
```

- 連番は①②③…の形式
- 質問文は太字
- 必須は別行の赤いピルにしない
- `※必須` を赤色で質問文と同一の意味まとまりとして表示する
- 長文の場合は自然な文節で折り返す
- `※必須` のために質問文末尾が1〜2文字だけ孤立する場合はレイアウトを調整する
- `overflow-wrap: anywhere` を質問見出しへ安易に使わない

### 6. 単一選択・複数選択

- 選択肢1つにつき白い横長ボックス
- 高さ50〜56px程度
- borderは薄いグレー
- radiusは8〜12px
- shadowは極薄
- 左側に20〜22px程度の四角い選択UI
- ラベル全体をタップ可能にする
- 選択中はブランドカラーを使う
- 単一選択でも見た目を丸型radioへ固定せず、全体デザインとの統一を優先する
- 選択肢ラベルも日本語として自然に折り返す

### 7. 1〜10評価

- 10個を必ず横一列
- 横スクロール禁止
- 各数字は円形またはコンパクトな角丸UI
- 非選択時は白背景 + 薄いborder + ブランドカラー文字
- 選択時はブランドカラー背景 + 白文字
- 下に左右方向を示すガイドと評価ラベルを置く

標準:

```text
1 2 3 4 5 6 7 8 9 10
→                              ←
非常に不満                非常に満足
```

- 375px / 390px / 430pxで確認する
- 数字のサイズより10個を一列に保つことを優先する
- 左右ラベルも不自然な1文字折り返しを起こさないよう確認する

### 8. 自由記述

- 白背景
- 薄いborder
- radius 8〜10px
- 高さ140px前後を初期値
- placeholderは薄いグレー
- resizeしてもレイアウトが破綻しない
- ユーザー入力は改行を尊重してよいが、長いURL等でのみ緊急折り返しを許可する

### 9. 送信ボタン

- 横幅100%
- 高さ58〜64px
- pill型
- ブランドカラー背景
- 白文字
- 16〜18px程度の太字
- 不要な強いshadowは使わない
- 長い日本語CTAは `text-wrap: balance` 等で意味単位を優先する

標準文言:

```text
アンケートを送信する
```

### 10. サンクス画面

公開アンケートと同じTypographyルールを適用する。

標準構成:

```text
✓
THANK YOU
ご回答ありがとうございました。
完了メッセージ
Google口コミ案内（有効時）
```

- `ご回答ありがとうございました。` を `ありがとうございまし / た。` のように分断しない
- 固定見出しは短い意味単位spanで折り返し候補を限定してよい
- 完了メッセージ本文は固定 `<br>` を使わず自然改行を基本とする
- Google口コミ案内・CTAも日本語Typography QA対象とする
- 自由記述再表示のみ `white-space: pre-wrap` を利用してよい
- 375px / 390px / 430px / Desktopで必ず確認する

### 11. Theme Token

レイアウトを店舗別に分岐させない。

店舗ごとの差は原則以下のtokenで吸収する。

```text
primaryColor
secondaryColor
accentColor
backgroundColor
heroOverlayColor
heroTextColor
buttonBackground
buttonTextColor
cardBackground
logoBadgeBackground
```

禁止:

```text
if (slug === '特定店舗') { ... }
```

推奨:

```text
共通SurveyRenderer
+ 共通ThanksPanel
+ Theme Token
+ config
```

## 業種別デザイン感

### Clinic Clean

- 清潔感
- 安心感
- 白 + 青緑系
- 装飾は控えめ
- heroは淡い青緑グラデーション

### Restaurant Clean

- 温かさ
- 上品さ
- 白〜アイボリー + ブラウン系
- 余白を広く取る

### Salon Clean

- 柔らかさ
- 上品さ
- 白〜薄いピンク/グレージュ + くすみカラー
- タイトルやブランド名は必要に応じてserifを使用

## 実装時チェック

UI修正時は最低限以下を確認する。

- 375pxで横スクロールがない
- 390pxで横スクロールがない
- 430pxで横スクロールがない
- 768pxでも意味途中の不自然な折り返しがない
- Desktopでも狭いカード幅で不自然な折り返しがない
- h1が1〜3行で自然に読める
- hero subtitleが自然な意味単位で折り返される
- 必須表示が質問文の直後に自然に見える
- 質問全体を囲う大きなカードがない
- 選択肢はタップ領域50px前後を確保
- rating 1〜10が一列
- textareaが隣接要素へ重ならない
- submit buttonが画面幅内に収まる
- Thanks画面H1の語尾が分断されない
- Review CTAが自然に読める
- previewと公開画面で同じSurveyRendererを使用する
- 配色はTheme Tokenで変更できる
- 特定slug専用のTypography CSSを追加していない
- コード確認だけでなく実画面またはスクリーンショットを目視した

## アクセシビリティ

見た目を変更してもHTMLの意味は残す。

- single choiceは`radio`
- multiple choiceは`checkbox`
- 1〜10評価は`radiogroup` / `radio`
- focus-visibleを消さない
- label全体をクリック可能にする
- 色だけで選択状態を表現しない
- 意味単位spanを追加しても見出し・本文のセマンティクスを壊さない

## Google口コミ導線に関する固定ルール

デザイン変更時も以下は変更しない。

- Google口コミ導線は `disabled`（非表示）、`all`（全回答者に表示）、`score`（指定したrating質問のスコア条件を満たす場合に表示）の3モードを許可する。
- `score` は質問単位の閾値と複数条件のAND / ORに対応する。基本UIは「○点以上」（`operator = gte`）とし、既存の `gte` / `lte` / `eq` との互換性を維持する。
- 回答者本人の自由記述をコピーする機能は可
- 店舗側が生成した好意的文章の自動投稿はしない

## 修正フロー

ユーザーから参考スクリーンショットが渡された場合は以下の順で実装する。

1. `JAPANESE_WEB_TYPOGRAPHY_SKILL.md` を読む
2. レイアウト構造を分析
3. 色・余白・文字サイズ・border・radius・shadowを分解
4. 日本語の不自然な折り返し箇所を一覧化
5. 特定店舗固有要素と再利用可能なデザイン原則を分離
6. 共通SurveyRenderer / ThanksPanelへ反映
7. Theme Tokenで業種差を吸収
8. 375 / 390 / 430 / Tablet / Desktopを確認
9. Heroだけでなく質問・CTA・Thanks・Review CTAまでVisual QA
10. 問題があれば修正→再表示→再確認
11. test / lint / typecheck / build
12. Skillへ確定ルールを追記
13. mainへ反映

## 今回確定した標準

- 白いブランドヘッダー
- カラーhero
- `QUESTIONNAIRE`ラベル
- h1 + 装飾ライン + subtitle
- h1 / subtitleは1行固定ではなく、日本語の意味と読みやすさを優先して自然に1〜3行へ収める
- 匿名案内はカード化しない
- 質問本体の大きな外枠カードを廃止
- ①②③形式の連番
- `※必須`をinline表示
- 選択肢のみ白いカード型
- radio / checkboxは四角い視覚表現
- 1〜10は横一列
- 評価下に最小/最大ラベル
- textareaはシンプルな白枠
- submitはブランドカラーのpill型
- サンクス画面も共通ThanksPanelで統一する
- `ご回答ありがとうございました。` 等の固定見出しは意味単位で分断防止する
- 日本語本文は `line-break: strict` / `word-break: normal` を基本とする
- 対応ブラウザでは `word-break: auto-phrase` をprogressive enhancementとして使う
- `text-wrap: balance` / `pretty` を補助として使う
- `overflow-wrap: anywhere` はURL・自由入力等へ限定する
- 特定店舗名に依存せず全テーマで再利用する
- 対象viewportは375 / 390 / 430pxを重点とし、Tablet / Desktopも確認する
- 公開画面と管理画面Previewは同じSurveyRendererを使用する
- 色・背景・ボタン・カード・ロゴ背景はTheme Tokenで変更し、特定店舗・slug専用CSSを禁止する
