import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyConversationIntent, classifyIntent, isReadyForConfirmation} from '../lib/assistant/intent';

test('31: bugを分類する', () => {
  assert.equal(classifyIntent('匿名に変更しても戻ってしまう').intent, 'bug');
  assert.equal(classifyIntent('保存したのに反映されない').intent, 'bug');
});

test('32: ux improvementを分類する', () => {
  assert.equal(classifyIntent('使用しないって何を使用しないのか分かりづらい').intent, 'ux_improvement');
  assert.equal(classifyIntent('ここが使いづらい').intent, 'ux_improvement');
});

test('33: feature requestを分類する', () => {
  assert.equal(classifyIntent('口コミをLINEにも送れるようにしたい').intent, 'feature_request');
  assert.equal(classifyIntent('CSVに項目を追加してほしい').intent, 'feature_request');
});

test('分類されなければhelpとして扱う', () => {
  assert.equal(classifyIntent('この画面の使い方を教えて').intent, 'help');
  assert.equal(classifyIntent('公開方法は？').intent, 'help');
});

test('会話全体の中で直近の非help発言を優先する', () => {
  const history = [{role: 'user' as const, content: 'この画面の使い方を教えて'}, {role: 'assistant' as const, content: '...'}];
  assert.equal(classifyConversationIntent(history, 'ここが使いづらいです').intent, 'ux_improvement');
});

test('34: helpはconfirmation対象にならない', () => {
  assert.equal(isReadyForConfirmation('help', [], '使い方を教えて'), false);
});

test('35: confirmation前にImprovement Requestを作らない(1往復目はまだ準備できていない)', () => {
  assert.equal(isReadyForConfirmation('bug', [], '戻ってしまう'), false);
});

test('36: 十分な情報が揃った(clarifying往復後、または詳細な1メッセージ)場合だけconfirm対象にする', () => {
  const history = [{role: 'user' as const, content: '戻ってしまいます'}, {role: 'assistant' as const, content: 'もう少し詳しく教えてください。'}];
  assert.equal(isReadyForConfirmation('bug', history, '匿名のみを選んでも保存すると匿名・記名選択に戻ってしまいます'), true);
  assert.equal(isReadyForConfirmation('bug', [], 'a'.repeat(40)), true);
});
