import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isCrestixEmail} from '../lib/auth/domain';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');
const migration=source('supabase/migrations/202609050001_crestix_domain_auto_approval.sql');

test('@crestix-inc.com は許可され、外部ドメインは拒否される',()=>{
  assert.equal(isCrestixEmail('futa.uoi@crestix-inc.com'),true);
  assert.equal(isCrestixEmail('RYUSHI.MATSUOKA@CRESTIX-INC.COM'),true);
  assert.equal(isCrestixEmail('someone@gmail.com'),false);
  assert.equal(isCrestixEmail('someone@yahoo.co.jp'),false);
});

test('偽装ドメインを許可しない（厳密なドメイン部分一致）',()=>{
  assert.equal(isCrestixEmail('user@crestix-inc.com.example.com'),false);
  assert.equal(isCrestixEmail('crestix-inc.com@gmail.com'),false);
  assert.equal(isCrestixEmail('nope'),false);
});

test('SignupFormはsubmit前にドメインを検証し、signUp()を呼ばない',()=>{
  const signup=source('components/admin/SignupForm.tsx');
  assert.match(signup,/if\(!isCrestixEmail\(email\)\)\{setError\(true\);setMessage\(domainError\);return\}/);
});

test('DBトリガーもis_crestix_emailで厳密なドメイン部分一致を行う',()=>{
  assert.match(migration,/substring\(coalesce\(p_email,''\) from '@\(\[\^@\]\+\)\$'\)/);
  assert.match(migration,/= 'crestix-inc\.com'/);
});

test('新規profileはcrestixドメインならsales+is_active trueで作成される',()=>{
  assert.match(migration,/values\(new\.id,coalesce\(new\.raw_user_meta_data->>'name',''\),coalesce\(new\.email,''\),'sales',true\)/);
});

test('crestix以外のメールはtrigger内でraise exceptionされ、auth.usersごとロールバックされる',()=>{
  assert.match(migration,/if not public\.is_crestix_email\(new\.email\) then/);
  assert.match(migration,/raise exception/);
});

test('既存adminはmigrationで一切触れない（backfillはrole=salesのみ対象）',()=>{
  const updateBlock=migration.slice(migration.indexOf('update public.profiles'));
  assert.match(updateBlock,/where role = 'sales'/);
  assert.doesNotMatch(updateBlock,/role = 'admin'/);
  assert.doesNotMatch(migration,/update public\.profiles\s+set role/);
});

test('is_staff/is_adminのRLS制御はis_active必須のまま変更しない',()=>{
  assert.doesNotMatch(migration,/create or replace function public\.is_staff/);
  assert.doesNotMatch(migration,/create or replace function public\.is_admin/);
});

test('deactivateUserActionは自分自身と最後の有効な管理者を保護する',()=>{
  const actions=source('app/actions.ts');
  const block=actions.slice(actions.indexOf('export async function deactivateUserAction'),actions.indexOf('export async function sendPasswordResetAction'));
  assert.match(block,/profileId===user\.id/);
  assert.match(block,/canDemoteAdmin\(target\.role,'sales',count\?\?0\)/);
  assert.match(block,/is_active:false/);
  assert.match(block,/eq\('is_active',true\)/);
});

test('/admin/usersは利用状況(利用中/停止中/再有効化/利用停止)を管理するUIになっている',()=>{
  const users=source('app/admin/users/page.tsx');
  assert.match(users,/利用中/);
  assert.match(users,/停止中/);
  assert.match(users,/再有効化/);
  assert.match(users,/利用停止/);
  assert.match(users,/deactivateUserAction/);
});

test('signup直後にセッションがあれば/adminへ遷移し、なければ完了メッセージを表示する',()=>{
  const signup=source('components/admin/SignupForm.tsx');
  assert.match(signup,/if\(data\.session\)\{router\.push\('\/admin'\);router\.refresh\(\);return\}/);
  assert.match(signup,/登録が完了しました。そのままログインしてアンケートシステムを利用できます。/);
});

test('/adminのlayoutとpageはsurveys\\/builder_sessionsをそれぞれ重複取得せず、cache済みのgetAdminSurveys等を共有する',()=>{
  const layout=source('app/admin/layout.tsx'),page=source('app/admin/page.tsx');
  assert.doesNotMatch(layout,/createClient/);
  assert.doesNotMatch(page,/createClient/);
  assert.match(layout,/getAdminSurveys\(\),getAdminBuilderSessions\(\)/);
  assert.match(page,/getAdminSurveys\(\),getAdminBuilderSessions\(\)/);
  const dataLib=source('lib/data.ts');
  assert.match(dataLib,/export const getAdminSurveys = cache\(/);
  assert.match(dataLib,/export const getAdminBuilderSessions = cache\(/);
});
