import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const source=(path:string)=>readFileSync(join(root,path),'utf8');

test('signupはbrowser Supabase signUpを使いservice roleを持たない',()=>{const signup=source('components/admin/SignupForm.tsx');assert.match(signup,/\.auth\.signUp\(/);assert.match(signup,/minLength=\{8\}/);assert.doesNotMatch(signup,/SERVICE_ROLE|console\.|token/)});
test('新規profileはsalesかつinactive、既存NULL profileだけactiveにする',()=>{const migration=source('supabase/migrations/202609040001_sales_signup_approval.sql');assert.match(migration,/where is_active is null/);assert.match(migration,/alter column is_active set default false/);assert.match(migration,/values\(new\.id,[\s\S]*?'sales',false\)/);assert.doesNotMatch(migration,/delete from|drop table|truncate/i)});
test('RLS helperはactiveなstaffとadminだけを許可する',()=>{const migration=source('supabase/migrations/202609040001_sales_signup_approval.sql');assert.match(migration,/role in \('admin','sales'\) and is_active = true/);assert.match(migration,/role = 'admin' and is_active = true/)});
test('server staffはroleとis_activeを検証する',()=>{const actions=source('app/actions.ts');const staff=actions.slice(actions.indexOf('async function staff'),actions.indexOf('async function isActiveSurvey'));assert.match(staff,/select\('role,is_active'\)/);assert.match(staff,/!p\.is_active/);assert.match(staff,/承認待ち/)});
test('inactiveのadmin layoutは管理データ取得前に承認待ちを返す',()=>{const layout=source('app/admin/layout.tsx');assert.match(layout,/if\(!profile\.is_active\)return/);assert.match(layout,/アカウント承認待ち/);assert.ok(layout.indexOf('if(!profile.is_active)return')<layout.indexOf("from('surveys')"))});
test('adminだけが承認できsalesの直接呼び出しを拒否する',()=>{const actions=source('app/actions.ts'),approve=actions.slice(actions.indexOf('export async function approveUserAction'),actions.indexOf('export async function sendPasswordResetAction'));assert.match(approve,/p\.role!=='admin'/);assert.match(approve,/update\(\{is_active:true\}\)/);assert.match(approve,/eq\('is_active',false\)/)});
test('ユーザー管理に利用中・承認待ちと利用許可を表示する',()=>{const users=source('app/admin/users/page.tsx');assert.match(users,/利用中/);assert.match(users,/承認待ち/);assert.match(users,/利用を許可/);assert.match(users,/approveUserAction/)});
