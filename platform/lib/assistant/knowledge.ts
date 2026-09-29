import type {AssistantPageType} from './types';

// Ground truth for the Help assistant. Every answer here describes behavior that is
// actually implemented today (verified against the current source, not guessed) - see
// docs/FEATURE_GLOSSARY.md, which is generated from the same facts. Keeping this as a
// flat, matchable registry (instead of one giant if/else chain) is what lets the
// fallback provider stay a plain lookup: add an entry, don't grow a branch tree.
export interface KnowledgeEntry {
  id: string;
  // Substrings matched against the (lowercased) user message. Japanese doesn't
  // tokenize cleanly on whitespace, so this is deliberately substring-based rather
  // than a word-boundary match.
  keywords: string[];
  // Optional: entries scoped to a page get a small relevance boost when the
  // assistant's current-page context matches, without requiring an exact match.
  pageTypes?: AssistantPageType[];
  answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'review-copy-disable',
    keywords: ['コピーしたくない', '文章をコピー', 'clipboard', '自動コピー', 'コピーされたくない'],
    pageTypes: ['survey_editor'],
    answer:
      '「口コミ・完了条件」の「口コミ用文章として使用する質問」を「使用しない」にしてください。' +
      'Google口コミページへの案内(CTA)は維持されますが、アンケートの自由記述回答をクリップボードへ自動コピーする動作は行われなくなります。',
  },
  {
    id: 'review-text-question-select',
    keywords: ['口コミ用文章', '長文をコピー', '自由記述をコピー', '感想をコピー'],
    pageTypes: ['survey_editor'],
    answer:
      '「口コミ・完了条件」の「口コミ用文章として使用する質問」で長文回答(textarea)の質問を選ぶと、' +
      'その質問への回答をコピーしてGoogle口コミ画面へ案内するボタンが表示されます。未設定のままだと、最初に入力された長文回答が自動的に使われます。',
  },
  {
    id: 'identity-anonymous-only',
    keywords: ['匿名で回答', '匿名のみ', '匿名にしたい', '名前を聞かない'],
    pageTypes: ['survey_editor', 'survey_builder'],
    answer:
      '「回答方法」の設定を「匿名のみ」にしてください。回答者に名前の入力欄は表示されず、匿名案内文だけが表示されます。',
  },
  {
    id: 'identity-identified-only',
    keywords: ['記名にしたい', '記名のみ', '名前を必須', 'お名前を必須'],
    pageTypes: ['survey_editor', 'survey_builder'],
    answer:
      '「回答方法」の設定を「記名のみ」にしてください。回答画面に必須のお名前入力欄が表示され、送信時に入力を求められます。',
  },
  {
    id: 'identity-respondent-choice',
    keywords: ['匿名か記名を選', '回答者が選', 'どちらか選べる', '匿名 記名 選択'],
    pageTypes: ['survey_editor', 'survey_builder'],
    answer:
      '「回答方法」の設定を「回答者が匿名・記名を選択」にしてください。回答画面の冒頭で「匿名で回答する」「記名で回答する」を回答者自身が選べるようになり、記名を選んだ場合だけお名前欄が表示されます。',
  },
  {
    id: 'identity-legacy',
    keywords: ['legacy', '古いアンケート', '昔のアンケート', '回答方法の設定がない'],
    pageTypes: ['survey_editor'],
    answer:
      '回答方法が未設定のまま作成された古いアンケートは「現在の設定を維持(従来形式)」として扱われ、これまで通り名前の入力欄も回答方法の選択も表示されません。' +
      '明示的に「回答者が匿名・記名を選択」「匿名のみ」「記名のみ」のいずれかを選ぶまで、この従来動作は変わりません。',
  },
  {
    id: 'draft-vs-publish',
    keywords: ['公開される', '保存したら公開', '下書き保存', '反映される', '編集したらすぐ'],
    pageTypes: ['survey_editor'],
    answer:
      '「下書き保存」だけでは公開中の画面は変わりません。編集内容は下書き(draft)にだけ保存されます。' +
      '公開画面へ反映するには「プレビュー」で確認したうえで、公開設定から「公開する」を押してください。',
  },
  {
    id: 'publish-action',
    keywords: ['公開するには', '公開方法', 'どうやって公開', '公開の仕方'],
    pageTypes: ['survey_editor', 'survey_builder'],
    answer:
      '「公開設定」の「公開する」ボタンを押すと、現在の下書きが公開版に切り替わります。公開後は新しい下書きが自動的に作成されるので、続けて編集できます。',
  },
  {
    id: 'unpublish-action',
    keywords: ['非公開にしたい', '公開を止め', '一時的に止め'],
    answer: '案件の「非公開にする」操作を使うと、公開URLへのアクセス時に「現在このアンケートは公開されていません」と表示され、回答を受け付けなくなります。',
  },
  {
    id: 'archive-delete',
    keywords: ['削除したら', '消したら', 'アーカイブ', '一覧から消し'],
    answer:
      '一覧からの削除は物理削除ではなくアーカイブ(archived)方式です。アーカイブ後も回答データは保持されます。削除・復元は管理者(admin)のみ実行できます。',
  },
  {
    id: 'google-review-mode-disabled',
    keywords: ['口コミを表示しない', '口コミ 出さない', 'disabled'],
    pageTypes: ['survey_editor'],
    answer: 'Google口コミへの案内を「使用しない」にすると、回答完了後の画面にGoogle口コミのご案内やボタンは一切表示されません。',
  },
  {
    id: 'google-review-mode-all',
    keywords: ['全員に口コミ', '全回答者', '口コミ 全員'],
    pageTypes: ['survey_editor'],
    answer: 'Google口コミへの案内を「全回答者へ表示」にすると、回答内容にかかわらず全員の完了画面にGoogle口コミの案内が表示されます。',
  },
  {
    id: 'google-review-mode-score',
    keywords: ['評価が高い人だけ', '条件付き 口コミ', 'スコア 口コミ', '基準点'],
    pageTypes: ['survey_editor'],
    answer:
      'Google口コミへの案内を「評価条件を満たした人だけ表示」にすると、選んだ評価質問の基準点を各質問ごとに設定できます。' +
      '「どれか1つ満たしたら表示」(OR)か「すべて満たしたら表示」(AND)を選べます。合計点の判定はできません(質問ごとの評価です)。',
  },
  {
    id: 'question-add',
    keywords: ['質問を追加', '質問追加したい', '質問を増やし'],
    pageTypes: ['survey_editor', 'survey_builder'],
    answer: '「質問」セクションの質問Builderで質問を追加できます。回答形式(短文テキスト・長文テキスト・ラジオボタン・チェックボックス・プルダウン・スコアリング)、必須/任意、選択肢、並び順を設定できます。',
  },
  {
    id: 'rating-scale',
    keywords: ['5点満点', '10点満点', '評価の点数', 'スコアリング 何点'],
    answer: 'スコアリング(評価)質問は5点満点か10点満点を選べます。回答画面では丸型ボタンが横一列で表示され、左右に評価ラベル(初期値:非常に不満/非常に満足)が付きます。',
  },
  {
    id: 'preview-usage',
    keywords: ['プレビュー', 'preview', '確認方法'],
    answer: '編集画面右側(モバイルでは下部)のプレビューは、実際の公開画面と同じ表示ロジックを使います。ここで送信することはできず、確認専用です。',
  },
  {
    id: 'responses-list',
    keywords: ['回答一覧', '回答を見る', '回答確認'],
    answer: '案件の「回答」画面で、回答日時・各質問への回答・合計スコア・平均スコアを確認できます。質問数が多い場合は横スクロールで表示します。',
  },
  {
    id: 'csv-export',
    keywords: ['csv', 'エクスポート', 'ダウンロード'],
    answer: '回答一覧からCSVをダウンロードできます。日本語版Excelでも文字化けしにくい形式で出力されます。',
  },
  {
    id: 'analytics',
    keywords: ['分析', 'アナリティクス', 'analytics'],
    answer: '案件の「分析」画面で回答傾向を確認できます。閲覧者(viewer)権限のユーザーは分析画面のみ閲覧できます。',
  },
  {
    id: 'viewer-permission',
    keywords: ['閲覧者', 'viewer権限', 'viewerは何ができる'],
    answer: '閲覧者(viewer)は担当案件の分析閲覧のみ可能で、アンケートの作成・編集・公開はできません。',
  },
  {
    id: 'google-sheets-sync',
    keywords: ['スプレッドシート', 'google sheets', 'シート連携'],
    answer: 'Supabaseが回答データの正本です。Google Sheetsへの同期は非同期のキュー処理で行われ、同期に失敗しても回答データ自体は失われません。',
  },
];
