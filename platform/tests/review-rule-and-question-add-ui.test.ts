import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('質問カード直下から次の質問を追加できる',()=>{
  const source=readFileSync(new URL('../components/admin/QuestionBuilder.tsx',import.meta.url),'utf8');
  assert.match(source,/この下に追加する回答形式/);
  assert.match(source,/この下に質問を追加/);
  assert.match(source,/next\.splice\(index\+1,0,created\)/);
  assert.match(source,/addQuestionAfter\(i\)/);
  assert.match(source,/addQuestionAfter\(-1\)/);
});

test('条件付き口コミを選んだとき条件が空なら初期条件を自動作成する',()=>{
  const source=readFileSync(new URL('../components/admin/ReviewSettings.tsx',import.meta.url),'utf8');
  assert.match(source,/value==='score'&&!rule\.conditions\.length&&scores\[0\]/);
  assert.match(source,/googleReviewRule:\{logic:'and',conditions:\[defaultCondition\(scores\[0\]\)\]\}/);
  assert.match(source,/対象質問/);
  assert.match(source,/判定方法/);
  assert.match(source,/基準点/);
  assert.match(source,/すべて満たす（AND）/);
  assert.match(source,/いずれかを満たす（OR）/);
});
