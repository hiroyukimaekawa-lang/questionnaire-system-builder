import assert from 'node:assert/strict';
import test from 'node:test';
import {isDedicatedGoogleReviewUrl,isGoogleSearchDemoReviewUrl} from '../lib/google-review';
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

test('商談デモとして明示した場合だけ旧Google検索URLを登録できる',()=>{
  const oldUrl='https://www.google.com/search?q=%E6%9D%BE%E6%9C%AC%E7%9C%BC%E7%A7%91#lrd=0x123:0x456,3,,,,';
  assert.equal(isGoogleSearchDemoReviewUrl(oldUrl),true);
  assert.match(validateReviewSettings({...defaultConfig,googleReviewMode:'all',googleReviewUrl:oldUrl},[])??'',/口コミ投稿専用URL/);
  assert.equal(validateReviewSettings({...defaultConfig,googleReviewMode:'all',googleReviewUrl:oldUrl,demoGoogleReviewLink:true},[]),null);
  assert.equal(isGoogleSearchDemoReviewUrl('https://evil.example/search?q=clinic#lrd=x'),false);
  assert.equal(isGoogleSearchDemoReviewUrl('https://www.google.com/search?q=clinic'),false);
  assert.match(validateReviewSettings({...defaultConfig,googleReviewMode:'all',googleReviewUrl:'https://evil.example/search?q=clinic#lrd=x',demoGoogleReviewLink:true},[])??'',/口コミ投稿専用URL/);
});
test('デモ用の明示フラグと本番用スマホ確認をAPIで区別する',()=>{
  const wizard=readFileSync(new URL('../components/builder/SurveyWizard.tsx',import.meta.url),'utf8');
  const api=readFileSync(new URL('../app/api/admin/surveys/create-from-builder/route.ts',import.meta.url),'utf8');
  assert.match(wizard,/商談デモ用（パソコンでの提案）/);
  assert.match(wizard,/!config\.demoGoogleReviewLink&&verifiedReviewUrl/);
  assert.match(api,/finalConfig\.demoGoogleReviewLink!==true&&body\.mobileReviewConfirmed!==true/);
});
