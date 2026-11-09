import assert from 'node:assert/strict';
import test from 'node:test';
import {isDedicatedGoogleReviewUrl} from '../lib/google-review';
import {validateReviewSettings} from '../lib/builder/settings';
import {defaultConfig} from '../lib/survey';
import {readFileSync} from 'node:fs';

const sample='https://search.google.com/local/writereview?placeid=ChIJ123456';
test('新規アンケートでは専用口コミURLを認め、検索結果URLを拒否する',()=>{
  assert.equal(isDedicatedGoogleReviewUrl(sample),true);
  assert.equal(isDedicatedGoogleReviewUrl('https://g.page/r/C123abc/review'),true);
  for(const url of [
    'https://www.google.com/search?q=clinic#lrd=example',
    'https://search.google.com/local/writereview',
    'https://evil.example/review',
    'javascript:alert(1)',
    'http://g.page/r/C123/review',
  ])assert.equal(isDedicatedGoogleReviewUrl(url),false,url);
  assert.equal(validateReviewSettings({...defaultConfig,googleReviewMode:'all',googleReviewUrl:sample},[]),null);
  assert.match(validateReviewSettings({...defaultConfig,googleReviewMode:'all',googleReviewUrl:'https://www.google.com/search?q=clinic'},[])??'',/口コミ投稿専用URL/);
  assert.equal(validateReviewSettings({...defaultConfig,googleReviewMode:'disabled',googleReviewUrl:null},[]),null);
});
test('新規作成にはスマホ確認チェックが必要で、URL変更時に確認を解除する',()=>{
  const source=readFileSync(new URL('../components/builder/SurveyWizard.tsx',import.meta.url),'utf8');
  const api=readFileSync(new URL('../app/api/admin/surveys/create-from-builder/route.ts',import.meta.url),'utf8');
  assert.match(source,/verifiedReviewUrl/);
  assert.match(source,/setVerifiedReviewUrl\(null\)/);
  assert.match(source,/スマホで正しいGoogle口コミ投稿画面への遷移を確認した/);
  assert.match(api,/body\.mobileReviewConfirmed!==true/);
});
