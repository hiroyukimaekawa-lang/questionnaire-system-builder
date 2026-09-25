import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {can} from '../lib/auth/permissions';
const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('viewerは回答・分析のみ利用でき編集や公開はできない',()=>{assert.equal(can('viewer','responses'),true);assert.equal(can('viewer','analytics'),true);assert.equal(can('viewer','edit'),false);assert.equal(can('viewer','publish'),false);assert.equal(can('viewer','manage_users'),false)});

test('案件RLSはactiveなowner・editor・viewerを共通helperで分離する',async()=>{const sql=await read('../supabase/migrations/202609250001_management_permissions_analytics.sql');assert.match(sql,/private\.can_view_survey_for/);assert.match(sql,/where id = p_user_id and is_active = true/);assert.match(sql,/owner_user_id = p_user_id/);assert.match(sql,/permission = 'editor'/);assert.match(sql,/drop policy if exists surveys_staff_all/);assert.match(sql,/responses_member_read/);assert.match(sql,/answers_member_read/)});

test('外部登録はpending invitationを要求し、membershipはメール確認後に作る',async()=>{const [sql,confirm,reconcile]=await Promise.all([read('../supabase/migrations/202609250001_management_permissions_analytics.sql'),read('../app/auth/confirm/route.ts'),read('../lib/invitations.ts')]);assert.match(sql,/status = 'pending' and expires_at > now\(\)/);assert.match(sql,/'viewer'::public\.user_role/);assert.doesNotMatch(sql,/insert into public\.survey_members\(survey_id,user_id/);assert.match(confirm,/verifyOtp/);assert.match(confirm,/acceptVerifiedInvitations/);assert.match(reconcile,/from\('survey_members'\)\.upsert/);assert.match(reconcile,/status:'accepted'/)});

test('公開アンケートはCookieを持たないanon clientを使う',async()=>{const [data,publicClient,response]=await Promise.all([read('../lib/data.ts'),read('../lib/supabase/public.ts'),read('../app/api/responses/route.ts')]);assert.match(data,/createPublicClient\(\)/);assert.match(publicClient,/persistSession:false/);assert.match(response,/createPublicClient\(\)/);assert.doesNotMatch(response,/supabase\/server/)});

test('メンバー管理はadminまたはownerに限定する',async()=>{const sql=await read('../supabase/migrations/202609250001_management_permissions_analytics.sql');assert.match(sql,/private\.can_manage_survey_members_for/);assert.match(sql,/survey_members_insert[\s\S]*can_manage_survey_members_for/);assert.match(sql,/survey_invitations_insert[\s\S]*can_manage_survey_members_for/)});

test('分析はRPCでAsia Tokyo集計しブラウザへ全回答を送らない',async()=>{const [sql,page]=await Promise.all([read('../supabase/migrations/202609250001_management_permissions_analytics.sql'),read('../app/admin/manage/[id]/analytics/page.tsx')]);assert.match(sql,/get_survey_analytics/);assert.match(sql,/at time zone 'Asia\/Tokyo'/);assert.match(page,/\.rpc\('get_survey_analytics'/)});

test('回答一覧は50件ページングで旧500件固定を使わない',async()=>{const source=await read('../lib/responses.ts');assert.match(source,/pageSize=50/);assert.match(source,/\.range\(from,from\+pageSize-1\)/);assert.doesNotMatch(source,/\.limit\(500\)/)});

test('service roleはserver-only clientに閉じ込める',async()=>{const [admin,form]=await Promise.all([read('../lib/supabase/admin.ts'),read('../components/admin/InviteUserForm.tsx')]);assert.match(admin,/import 'server-only'/);assert.match(admin,/SUPABASE_SERVICE_ROLE_KEY/);assert.doesNotMatch(form,/SERVICE_ROLE|createAdminClient/)});
