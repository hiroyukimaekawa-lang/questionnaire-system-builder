import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readPlatform = (path: string) => readFileSync(join(import.meta.dirname, '..', path), 'utf8');
const readRoot = (path: string) => readFileSync(join(import.meta.dirname, '..', '..', path), 'utf8');

test('Thanks見出しは活用語尾を分断しない意味単位spanを使う', () => {
  const thanks = readPlatform('components/survey/ThanksPanel.tsx');
  assert.match(thanks, /thanks-title-phrase">ご回答<\/span>/);
  assert.match(thanks, /thanks-title-phrase">ありがとうございました。<\/span>/);
  assert.doesNotMatch(thanks, /ありがとうございまし\s*<br/);
  assert.doesNotMatch(thanks, /<br\s*\/?\s*>/);
});

test('公開アンケートとThanksへ共通Japanese typography classを適用する', () => {
  const renderer = readPlatform('components/survey/SurveyRenderer.tsx');
  const thanks = readPlatform('components/survey/ThanksPanel.tsx');
  for (const className of ['jp-heading', 'jp-copy', 'jp-ui-label']) {
    assert.match(renderer, new RegExp(className));
  }
  assert.match(thanks, /className="thanks-title jp-heading"/);
  assert.match(thanks, /className="card thanks-panel jp-copy"/);
  assert.match(thanks, /className="jp-keep">よろしければ、<\/span>/);
});

test('CSSは日本語禁則とauto-phraseをprogressive enhancementで使用する', () => {
  const css = readPlatform('app/survey.css');
  assert.match(css, /line-break:\s*strict/);
  assert.match(css, /word-break:\s*normal/);
  assert.match(css, /@supports \(word-break: auto-phrase\)/);
  assert.match(css, /word-break:\s*auto-phrase/);
  assert.match(css, /text-wrap:\s*balance/);
  assert.match(css, /text-wrap:\s*pretty/);
  assert.doesNotMatch(css, /word-break:\s*break-all/);
});

test('overflow-wrap:anywhereは自由入力の緊急折り返しだけに限定する', () => {
  const css = readPlatform('app/survey.css');
  const anywhere = css.match(/overflow-wrap:\s*anywhere/g) ?? [];
  assert.equal(anywhere.length, 1);
  assert.match(css, /\.thanks-comment-text[\s\S]*?overflow-wrap:\s*anywhere/);
});

test('Japanese Web Typography SkillをCodexとDesign Skillから必須参照する', () => {
  const skill = readRoot('JAPANESE_WEB_TYPOGRAPHY_SKILL.md');
  const design = readRoot('SURVEY_DESIGN_SKILL.md');
  const codex = readRoot('CODEX_PROMPT.md');
  assert.match(skill, /Japanese Web Typography Skill/);
  assert.match(skill, /375px \/ 390px \/ 430px/);
  assert.match(skill, /ありがとうございまし \/ た。/);
  assert.match(design, /JAPANESE_WEB_TYPOGRAPHY_SKILL\.md/);
  assert.match(codex, /JAPANESE_WEB_TYPOGRAPHY_SKILL\.md/);
});
