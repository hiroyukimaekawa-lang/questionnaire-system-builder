import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=(path:string)=>readFileSync(join(import.meta.dirname,'..',path),'utf8');

test('編集画面最下部は静的な案内文ではなく実際の公開操作を持つ',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/id="publish-settings"[^]*?<PublishSection variant="full"/);
  assert.doesNotMatch(workspace,/右のプレビューで本編・サンクス・口コミ導線を確認してから、画面上部の公開ボタンを押してください/);
});

test('未公開時は「アンケートを公開する」、公開後に編集した下書きがある場合は「変更内容を公開する」',()=>{
  const section=source('components/admin/PublishSection.tsx');
  assert.match(section,/hasPublishedBefore\?'変更内容を公開する':'アンケートを公開する'/);
});

test('公開中はPublicUrlActionsを再利用し、独自のコピー/QR実装を持たない',()=>{
  const section=source('components/admin/PublishSection.tsx');
  assert.match(section,/import \{PublicUrlActions\} from '@\/components\/admin\/PublicUrlActions'/);
  assert.match(section,/<PublicUrlActions url=\{publicUrl\} slug=\{slug\} compact=\{variant==='compact'\}\/>/);
  assert.doesNotMatch(section,/navigator\.clipboard|QRCode\.toDataURL/);
});

test('公開直後は成功状態が分かる文言になる',()=>{
  const section=source('components/admin/PublishSection.tsx');
  assert.match(section,/justPublished\?'公開しました ✓':'公開中 ✓'/);
});

test('publishActionとunpublishActionをそのまま利用し、上部と最下部で同じ操作を共有する',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  const page=source('app/admin/surveys/[id]/page.tsx');
  assert.match(workspace,/publishAction=\{publishAction\}/);
  assert.match(workspace,/unpublishAction=\{unpublishAction\}/);
  assert.match(page,/publishAction=\{publishAction\.bind\(null,id\)\}/);
  assert.match(page,/unpublishAction=\{unpublishAction\.bind\(null,id\)\}/);
  assert.doesNotMatch(page,/この下書きを公開/);
});

test('公開URLはappUrl()ベースのcanonical Pages URLを使い、workers.devを表示しない',()=>{
  const page=source('app/admin/surveys/[id]/page.tsx');
  assert.match(page,/const publicUrl=`\$\{appUrl\(\)\}\/\$\{survey\.slug\}`/);
  assert.doesNotMatch(page,/workers\.dev/);
});

test('保存フォーム(BasicForm/ConfigForm/QuestionBuilder/CompletionSettingsForm)は公開操作に統合されない',()=>{
  const workspace=source('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(workspace,/<BasicForm survey=\{survey\}\/>/);
  assert.match(workspace,/<ConfigForm surveyId=\{survey\.id\} versionId=\{draft\.id\} config=\{draft\.config\}\/>/);
  assert.match(workspace,/<QuestionBuilder surveyId=\{survey\.id\} versionId=\{draft\.id\}/);
  assert.match(workspace,/<CompletionSettingsForm surveyId=\{survey\.id\} versionId=\{draft\.id\}/);
  assert.doesNotMatch(workspace,/保存して公開/);
});
