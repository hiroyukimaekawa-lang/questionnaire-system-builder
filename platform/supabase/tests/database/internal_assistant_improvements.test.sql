begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

select has_table('public', 'improvement_requests', 'improvement_requests table exists');
select has_column('public', 'improvement_requests', 'reporter_user_id', 'has reporter_user_id');
select has_column('public', 'improvement_requests', 'status', 'has status');
select has_column('public', 'improvement_requests', 'category', 'has category');
select has_column('public', 'improvement_requests', 'proposal', 'has proposal');
select has_column('public', 'improvement_requests', 'context', 'has context');
select has_column('public', 'improvement_requests', 'idempotency_key', 'has idempotency_key');

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'assistant-admin@crestix-inc.com', '{}'::jsonb),
  ('a0000000-0000-4000-8000-000000000002', 'assistant-sales-a@crestix-inc.com', '{}'::jsonb),
  ('a0000000-0000-4000-8000-000000000003', 'assistant-sales-b@crestix-inc.com', '{}'::jsonb),
  ('a0000000-0000-4000-8000-000000000004', 'assistant-viewer@crestix-inc.com', '{}'::jsonb);

update public.profiles set role = 'admin', is_active = true where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'sales', is_active = true where id in (
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003'
);
update public.profiles set role = 'viewer', is_active = true where id = 'a0000000-0000-4000-8000-000000000004';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);

insert into public.improvement_requests (id, reporter_user_id, category, message, proposal, context, idempotency_key) values (
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'bug',
  '匿名に変更しても戻ってしまう',
  '{"category":"bug","summary":"匿名に変更しても戻ってしまう"}'::jsonb,
  '{"system":"questionnaire","pageType":"survey_editor"}'::jsonb,
  'idem-key-1'
);
select results_eq(
  'select count(*) from public.improvement_requests',
  array[1::bigint],
  'sales reporter sees their own submitted request'
);

select throws_ok(
  $$ insert into public.improvement_requests(reporter_user_id,category,message) values ('a0000000-0000-4000-8000-000000000003','bug','spoofed') $$,
  '42501',
  'sales cannot insert an improvement request attributed to another user'
);

select throws_ok(
  $$ insert into public.improvement_requests(reporter_user_id,category,message,idempotency_key) values ('a0000000-0000-4000-8000-000000000002','bug','duplicate','idem-key-1') $$,
  '23505',
  'same reporter cannot reuse an idempotency key'
);

update public.improvement_requests set status = 'resolved' where id = 'b0000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select status from public.improvement_requests where id = 'b0000000-0000-4000-8000-000000000001' $$,
  array['submitted'::text],
  'reporter cannot change the status of their own request'
);

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000003', true);
select results_eq(
  'select count(*) from public.improvement_requests',
  array[0::bigint],
  'a different sales rep cannot see another reporter''s request'
);

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000004', true);
select results_eq(
  'select count(*) from public.improvement_requests',
  array[0::bigint],
  'viewer sees no improvement requests'
);
select throws_ok(
  $$ insert into public.improvement_requests(reporter_user_id,category,message) values ('a0000000-0000-4000-8000-000000000004','bug','viewer attempt') $$,
  '42501',
  'viewer cannot insert an improvement request'
);

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
select results_eq(
  'select count(*) from public.improvement_requests',
  array[1::bigint],
  'admin reads every submitted improvement request'
);
update public.improvement_requests set status = 'resolved' where id = 'b0000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select status from public.improvement_requests where id = 'b0000000-0000-4000-8000-000000000001' $$,
  array['resolved'::text],
  'admin can update the status of any request'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select results_eq(
  'select count(*) from public.improvement_requests',
  array[0::bigint],
  'anonymous cannot read any improvement request'
);
select isnt(has_table_privilege('anon', 'public.improvement_requests', 'select'), true, 'anonymous has no table-level select privilege');

select * from finish();
rollback;
