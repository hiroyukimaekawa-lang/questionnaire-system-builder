import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {can} from '../lib/auth/permissions';
const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('viewerは回答・分析のみ利用でき編集や公開はできない',()=>{assert.equal(can('viewer','responses'),true);assert.equal(can('viewer','analytics'),true);assert.equal(can('viewer','edit'),false);assert.equal(can('viewer','publish'),false);assert.equal(can('viewer','manage_users'),false)});

test('案件RLSはowner・editor・viewerを共通helperで分離する',async()=>{const sql=await read('../supabase/migrations/202609250001_management_permissions_analytics.sql');assert.match(sql,/private\.can_view_survey_for/);assert.match(sql,/owner_user_id = p_user_id/);assert.match(sql,/permission = 'editor'/);assert.match(sql,/drop policy if exists surveys_staff_all/);assert.match(sql,/responses_member_read/);assert.match(sql,/answers_member_read/)});

test('外部登録はpending invitationがある場合だけviewerとして作成する',async()=>{const sql=await read('../supabase/migrations/202609250001_management_permissions_analytics.sql');assert.match(sql,/status = 'pending' and expires_at > now\(\)/);assert.match(sql,/'viewer'::public\.user_role/);assert.match(sql,/insert into public\.survey_members/)});

test('分析はRPCでAsia Tokyo集計しブラウザへ全回答を送らない',async()=>{const [sql,page]=await Promise.all([read('../supabase/migrations/202609250001_management_permissions_analytics.sql'),read('../app/admin/manage/[id]/analytics/page.tsx')]);assert.match(sql,/get_survey_analytics/);assert.match(sql,/at time zone 'Asia\/Tokyo'/);assert.match(page,/\.rpc\('get_survey_analytics'/)});

test('回答一覧は50件ページングで旧500件固定を使わない',async()=>{const source=await read('../lib/responses.ts');assert.match(source,/pageSize=50/);assert.match(source,/\.range\(from,from\+pageSize-1\)/);assert.doesNotMatch(source,/\.limit\(500\)/)});

test('service roleはserver-only clientに閉じ込める',async()=>{const [admin,form]=await Promise.all([read('../lib/supabase/admin.ts'),read('../components/admin/InviteUserForm.tsx')]);assert.match(admin,/import 'server-only'/);assert.match(admin,/SUPABASE_SERVICE_ROLE_KEY/);assert.doesNotMatch(form,/SERVICE_ROLE|createAdminClient/)});
