import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildBuilderPreviewVersion,resolveBuilderPreviewTarget} from '../components/builder/builderPreview';
import {defaultConfig} from '../lib/survey';
import {getThemeTemplate} from '../lib/theme/templates';

const read=(path:string)=>readFileSync(join(import.meta.dirname,'..',path),'utf8');

test('SurveyConfigとdefaultConfigがheroLabelを持つ',()=>{
  assert.match(read('types/database.ts'),/heroLabel\?: string/);
  assert.equal(defaultConfig.heroLabel,'QUESTIONNAIRE');
});

test('旧configと空のheroLabelはRendererでQUESTIONNAIREへfallbackする',()=>{
  const renderer=read('components/survey/SurveyRenderer.tsx');
  assert.match(renderer,/config\.heroLabel\?\.trim\(\)\|\|'QUESTIONNAIRE'/);
  assert.doesNotMatch(renderer,/<p className="survey-hero-label">QUESTIONNAIRE<\/p>/);
});

test('hero 3項目は専用preview targetへ解決しmainColorへ誤接続しない',()=>{
  for(const field of ['heroLabel','heroTitle','heroSubtitle'] as const)assert.deepEqual(resolveBuilderPreviewTarget(field,{}),{kind:'heroCopy',field});
  assert.doesNotMatch(read('components/builder/builderPreview.ts'),/heroSubtitle:'mainColor'/);
});

test('Builder previewへhero 3項目を即時反映し未設定値はfallbackする',()=>{
  const values={heroLabel:'SURVEY',heroTitle:'ご来院アンケート',heroSubtitle:'率直な声をお聞かせください'};
  const preview=buildBuilderPreviewVersion({themeId:'clinic-clean',...values});
  assert.equal(preview.config.heroLabel,values.heroLabel);
  assert.equal(preview.config.heroTitle,values.heroTitle);
  assert.equal(preview.config.heroSubtitle,values.heroSubtitle);
  const fallback=buildBuilderPreviewVersion({themeId:'clinic-clean'});
  assert.equal(fallback.config.heroLabel,'QUESTIONNAIRE');
  assert.equal(fallback.config.heroSubtitle,getThemeTemplate('clinic-clean').config.heroSubtitle);
});

test('Previewのhero 3項目がクリック可能でQuick Editorはcontextへ直接反映する',()=>{
  const renderer=read('components/survey/SurveyRenderer.tsx');
  const workspace=read('components/builder/BuilderWorkspace.tsx');
  for(const field of ['heroLabel','heroTitle','heroSubtitle'])assert.match(renderer,new RegExp(`onEditTarget\\?\\.\\('${field}'\\)`));
  assert.match(workspace,/function HeroCopyQuickEditor/);
  assert.match(workspace,/setContext\(current=>\(\{\.\.\.current,\[field\]:value\}\)\)/);
  assert.match(workspace,/resolved\.kind==='heroCopy'/);
  assert.doesNotMatch(workspace,/resolved\.kind==='heroCopy'[\s\S]{0,300}reopenBuilderStep/);
});

test('作成保存と既存編集にhero 3項目が接続される',()=>{
  const actions=read('app/actions.ts');
  const form=read('components/admin/SurveyForms.tsx');
  const editor=read('components/admin/SurveyEditorWorkspace.tsx');
  assert.match(actions,/heroLabel=context\.heroLabel\?\.trim\(\)\|\|'QUESTIONNAIRE'/);
  assert.match(actions,/heroSubtitle=context\.heroSubtitle\?\.trim\(\)\|\|theme\.config\.heroSubtitle/);
  assert.match(form,/name="heroLabel"/);
  assert.match(actions,/heroLabel:val\('heroLabel'\)\|\|'QUESTIONNAIRE'/);
  assert.match(editor,/'heroLabel'/);
});

test('通常作成フローは既存heroTitle STEPを維持しheroLabelとheroSubtitleの必須STEPを増やさない',()=>{
  const engine=read('lib/builder/engine.ts');
  assert.match(engine,/if \(!c\.heroTitle\?\.trim\(\)\) return \{ id: 'heroTitle'/);
  assert.doesNotMatch(engine,/return \{ id: 'heroLabel'/);
  assert.doesNotMatch(engine,/return \{ id: 'heroSubtitle'/);
});
