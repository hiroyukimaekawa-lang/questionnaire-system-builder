import test from 'node:test';
import assert from 'node:assert/strict';
import {runConversationTurn} from '../lib/assistant/conversation';
import {fallbackAssistantProvider} from '../lib/assistant/fallback-provider';
import {improvementProposalDraftSchema} from '../lib/assistant/schema';
import type {AssistantMessage, QuestionnaireAssistantContext} from '../lib/assistant/types';

const context: QuestionnaireAssistantContext = {
  system: 'questionnaire',
  pagePath: '/admin/surveys/abc',
  pageType: 'survey_editor',
  activeSection: 'design-copy',
  userRole: 'sales',
  environment: 'development',
};

test('helpはその場で回答し、confirmation対象にならない', async () => {
  const {intent, reply} = await runConversationTurn({
    message: 'アンケートの公開方法を教えて',
    history: [],
    context,
    provider: fallbackAssistantProvider,
  });
  assert.equal(intent.intent, 'help');
  assert.equal(reply.readyForConfirmation, false);
  assert.equal(reply.proposal, undefined);
});

test('39: helpのやり取りだけではImprovement Requestを作らない(readyForConfirmationが一度もtrueにならない)', async () => {
  const messages = ['この画面の使い方を教えて', 'Google口コミ設定について教えて', 'アンケートの公開方法を教えて'];
  for (const message of messages) {
    const {reply} = await runConversationTurn({message, history: [], context, provider: fallbackAssistantProvider});
    assert.equal(reply.readyForConfirmation, false);
  }
});

test('35: bugらしき最初の一言には確認用の質問を返し、まだconfirmationしない', async () => {
  const {intent, reply} = await runConversationTurn({
    message: '匿名に変更しても戻ってしまう',
    history: [],
    context,
    provider: fallbackAssistantProvider,
  });
  assert.equal(intent.intent, 'bug');
  assert.equal(reply.readyForConfirmation, false);
  assert.equal(reply.proposal, undefined);
  assert.match(reply.message, /詳しく教えてください/);
});

test('36/37: 十分な情報が集まったらconfirmation用のproposalを返し、スキーマに適合する', async () => {
  const history: AssistantMessage[] = [
    {role: 'user', content: '匿名に変更しても戻ってしまう'},
    {role: 'assistant', content: 'もう少し詳しく教えてください。どの画面で、どのような操作をしたときに発生しますか？'},
  ];
  const {intent, reply} = await runConversationTurn({
    message: '文章・ロゴ設定で回答方法を匿名のみに変更して保存すると、再度開くと選択が戻っています',
    history,
    context,
    provider: fallbackAssistantProvider,
  });
  assert.equal(intent.intent, 'bug');
  assert.equal(reply.readyForConfirmation, true);
  assert.ok(reply.proposal);
  const parsed = improvementProposalDraftSchema.safeParse(reply.proposal);
  assert.equal(parsed.success, true);
  assert.equal(reply.proposal!.category, 'bug');
  assert.match(reply.message, /以下の内容で改善要望として送れます/);
});

test('ux_improvementとfeature_requestもそれぞれ正しいcategoryのproposalを組み立てる', async () => {
  const uxHistory: AssistantMessage[] = [
    {role: 'user', content: 'ここが使いづらい'},
    {role: 'assistant', content: '現在開いている画面のどの部分について、どのように分かりにくいと感じましたか？'},
  ];
  const {reply: uxReply} = await runConversationTurn({
    message: '「使用しない」という表示だけだと、口コミ自体を使わないという意味に見えて分かりにくいです',
    history: uxHistory,
    context,
    provider: fallbackAssistantProvider,
  });
  assert.equal(uxReply.proposal?.category, 'ux_improvement');

  const featureHistory: AssistantMessage[] = [
    {role: 'user', content: '口コミをLINEにも送れるようにしたい'},
    {role: 'assistant', content: 'どのような場面でその機能を使いたいか、もう少し教えてください。'},
  ];
  const {reply: featureReply} = await runConversationTurn({
    message: '来店後すぐにLINEで口コミ投稿を案内したい店舗が多いためです',
    history: featureHistory,
    context,
    provider: fallbackAssistantProvider,
  });
  assert.equal(featureReply.proposal?.category, 'feature_request');
});

test('affectedAreaに現在ページのpageTypeとactiveSectionが含まれる', async () => {
  const history: AssistantMessage[] = [
    {role: 'user', content: '匿名に変更しても戻ってしまう'},
    {role: 'assistant', content: '...'},
  ];
  const {reply} = await runConversationTurn({
    message: '文章・ロゴ設定で回答方法を変更して保存しても、再読み込みすると元に戻っています',
    history,
    context,
    provider: fallbackAssistantProvider,
  });
  assert.deepEqual(reply.proposal?.affectedArea, ['survey_editor', 'design-copy']);
});
