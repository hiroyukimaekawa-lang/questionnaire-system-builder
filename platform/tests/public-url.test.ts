import test from 'node:test';import assert from 'node:assert/strict';import {hasPublicUrl,publicSurveyUrl} from '../lib/public-url';
test('公開URLはNEXT_PUBLIC_APP_URL相当のbaseとcanonical /slugを使う',()=>assert.equal(publicSurveyUrl('https://questionnaire.example/','sample'),'https://questionnaire.example/sample'));
test('公開中だけ公開URL操作を表示対象にする',()=>{assert.equal(hasPublicUrl('published'),true);assert.equal(hasPublicUrl('draft'),false);assert.equal(hasPublicUrl('unpublished'),false)});
