import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const read=(path:string)=>readFileSync(join(here,'..',path),'utf8');

test('ライブプレビューはクリック対象を編集ワークスペースへ渡し、モバイルではプレビューを閉じる',()=>{
  const source=read('components/admin/LiveSurveyPreview.tsx');
  assert.match(source,/onEditTarget=\{edit\}/);
  assert.match(source,/setOpen\(false\)/);
  assert.match(source,/onEdit\(target\)/);
});

test('質問プレビューはquestion idで対応する編集カードを特定できる',()=>{
  const workspace=read('components/admin/SurveyEditorWorkspace.tsx');
  const builder=read('components/admin/QuestionBuilder.tsx');
  assert.match(workspace,/dataset\.questionId===questionId/);
  assert.match(workspace,/\[data-question-title\]/);
  assert.match(builder,/data-question-id=\{q\.id\}/);
  assert.match(builder,/data-question-title/);
});

test('口コミプレビューは口コミ・完了条件へフォールバック遷移できる',()=>{
  const source=read('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(source,/target==='googleReview'/);
  assert.match(source,/getElementById\('completion-settings'\)/);
});
