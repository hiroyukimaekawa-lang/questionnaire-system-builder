import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultConfig} from '../lib/survey';
import {isAnonymousSurvey, publicSurveyTitle} from '../lib/public-survey';
import {buildBuilderPreviewVersion} from '../components/builder/builderPreview';

test('匿名設定は明示値を優先し、旧作成フローのON/OFFも復元する',()=>{
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymous:false}),false);
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymous:true,anonymousText:''}),true);
  assert.equal(isAnonymousSurvey(defaultConfig),true);
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymousText:'こちらのアンケートは匿名です。'}),true);
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymousText:'回答内容は運営者が確認します。'}),false);
  assert.equal(isAnonymousSurvey({...defaultConfig,anonymousText:''}),false);
});

test('任意の事業者名を旧結合タイトルから分離し、独自タイトルは維持する',()=>{
  for(const name of ['店','地域のクリニック（駅前院）','A very long business name']){
    assert.equal(publicSurveyTitle(name,{...defaultConfig,heroTitle:`${name} お客様アンケート`}), 'お客様アンケート');
    assert.equal(publicSurveyTitle(name,{...defaultConfig,heroTitle:'サービスについてのご意見'}),'サービスについてのご意見');
  }
});

test('作成プレビューは匿名の真偽値を引き継ぐ',()=>{
  for(const anonymous of [true,false])assert.equal(isAnonymousSurvey(buildBuilderPreviewVersion({anonymous}).config),anonymous);
});

test('共通公開テンプレートは匿名OFFで親要素を省略し装飾を出力しない',()=>{
  const renderer=readFileSync(new URL('../components/survey/SurveyRenderer.tsx',import.meta.url),'utf8');
  assert.match(renderer,/isAnonymousSurvey\(config\)&&<div className="survey-intro">/);
  assert.match(renderer,/<strong className="survey-business-name">\{name\}<\/strong>/);
  assert.match(renderer,/<h1>\{heroTitle\}<\/h1>/);
  assert.doesNotMatch(renderer,/YOUR VOICE MATTERS|rating-scale|→|←|survey-icon-fallback/);
});
