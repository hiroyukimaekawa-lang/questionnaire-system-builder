import test from 'node:test';
import assert from 'node:assert/strict';
import {findKnowledgeMatch} from '../lib/assistant/knowledge-match';
import {fallbackAssistantProvider} from '../lib/assistant/fallback-provider';
import type {QuestionnaireAssistantContext} from '../lib/assistant/types';

const baseContext: QuestionnaireAssistantContext = {
  system: 'questionnaire',
  pagePath: '/admin/surveys/abc',
  pageType: 'survey_editor',
  userRole: 'sales',
  environment: 'development',
};

test('25: 口コミの自動コピーを止める質問に「使用しない」の案内で答える', () => {
  const match = findKnowledgeMatch('口コミに回答文章をコピーしたくない', 'survey_editor');
  assert.ok(match);
  assert.match(match!.answer, /使用しない/);
  assert.match(match!.answer, /コピーする動作は行われなくなります/);
});

test('26: 匿名設定の質問にanonymous_only相当の操作を案内する', () => {
  const match = findKnowledgeMatch('匿名で回答させたい', 'survey_editor');
  assert.ok(match);
  assert.match(match!.answer, /匿名のみ/);
});

test('27: respondent_choiceの質問に正しい操作を案内する', () => {
  const match = findKnowledgeMatch('回答者に匿名か記名を選ばせたい', 'survey_editor');
  assert.ok(match);
  assert.match(match!.answer, /回答者が匿名・記名を選択/);
});

test('28: Draft/Publishの質問に「保存だけでは公開されない」と答える', () => {
  const match = findKnowledgeMatch('編集したらすぐ公開される？', 'survey_editor');
  assert.ok(match);
  assert.match(match!.answer, /下書き保存」だけでは公開中の画面は変わりません/);
});

test('29: Archiveの質問に「回答データは保持される」と答える', () => {
  const match = findKnowledgeMatch('アンケートを消したら回答も消える？');
  assert.ok(match);
  assert.match(match!.answer, /アーカイブ/);
  assert.match(match!.answer, /回答データは保持されます/);
});

test('30: 未知の質問はhallucinateせず、確認できない旨を返す', async () => {
  const reply = await fallbackAssistantProvider.answerHelp({
    message: '存在しない魔法のボタンはどこですか',
    context: baseContext,
    history: [],
  });
  assert.equal(reply.message, '現在の仕様からは確認できません。改善要望または確認事項として整理しますか？');
  assert.equal(reply.readyForConfirmation, false);
});

test('現在画面Context(activeSection)が一致する知識をわずかに優先する', () => {
  const match = findKnowledgeMatch('これ何？', 'survey_editor');
  // A generic greeting matches nothing - context alone never fabricates an answer.
  assert.equal(match, null);
});

test('31: Google口コミ画面での「これ何？」的な質問は既存のスコア条件説明でカバーされる', () => {
  const match = findKnowledgeMatch('評価が高い人だけ口コミを出したい', 'survey_editor');
  assert.ok(match);
  assert.match(match!.answer, /どれか1つ満たしたら表示/);
  assert.match(match!.answer, /合計点の判定はできません/);
});
