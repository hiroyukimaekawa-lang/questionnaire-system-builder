import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewComment} from '../lib/builder/settings';
import type {SurveyConfig, SurveyQuestion} from '../types/database';
import {defaultConfig} from '../lib/survey';
import {readFileSync} from 'node:fs';

const textarea = (id: string): SurveyQuestion => ({id, type: 'textarea', title: `感想${id}`, description: '', required: false, sortOrder: 0, settings: {}, options: []});

test('41: reviewTextQuestionId===nullではコピーせず(comment=\'\')、CTA自体は口コミmode次第で表示可能', () => {
  const config: SurveyConfig = {...defaultConfig, reviewTextQuestionId: null};
  const questions = [textarea('q1')];
  const comment = reviewComment(config, questions, {q1: '来店してよかったです'});
  assert.equal(comment, '');
});

test('41: 選択したtextarea質問の回答だけがcommentになり、他のtextarea回答はコピーされない', () => {
  const config: SurveyConfig = {...defaultConfig, reviewTextQuestionId: 'q2'};
  const questions = [textarea('q1'), textarea('q2')];
  const comment = reviewComment(config, questions, {q1: '無関係な回答', q2: '選択した質問の回答'});
  assert.equal(comment, '選択した質問の回答');
});

test('41: 未設定(legacy)では最初に入力された長文回答が使われる', () => {
  const config: SurveyConfig = {...defaultConfig};
  delete (config as Partial<SurveyConfig>).reviewTextQuestionId;
  const questions = [textarea('q1'), textarea('q2')];
  const comment = reviewComment(config, questions, {q2: '2問目の回答'});
  assert.equal(comment, '2問目の回答');
});

test('12: 「使用しない」選択時のUI説明文が追加されている(runtime挙動は変更しない)', () => {
  const source = readFileSync(new URL('../components/admin/ReviewSettings.tsx', import.meta.url), 'utf8');
  assert.match(source, /config\.reviewTextQuestionId===null\?'Google口コミページへの案内は行いますが、アンケート回答文の自動コピーは行いません。'/);
  assert.match(source, /'選択した質問への回答をコピーして、Google口コミ画面へ案内します。'/);
  // The select's value/onChange wiring (the actual contract) is untouched by the copy addition.
  assert.match(source, /<select name="reviewTextQuestionId" value=\{config\.reviewTextQuestionId===undefined\?'__legacy':config\.reviewTextQuestionId\?\?''\} onChange=\{e=>onChange\(\{reviewTextQuestionId:e\.target\.value\|\|null\}\)\}>/);
});
