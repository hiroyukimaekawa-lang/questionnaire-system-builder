begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

select has_column('public','google_sheets_sync_queue','next_attempt_at','queue has next_attempt_at');
select has_column('public','google_sheets_sync_queue','lease_expires_at','queue has lease_expires_at');
select has_column('public','google_sheets_sync_queue','lock_token','queue has lock_token');
select ok(position('skip locked' in lower(pg_get_functiondef('public.claim_google_sheets_sync_jobs(integer)'::regprocedure)))>0,'claim uses SKIP LOCKED');
select isnt(has_function_privilege('anon','public.claim_google_sheets_sync_jobs(integer)','execute'),true,'anon cannot claim jobs');
select isnt(has_function_privilege('authenticated','public.retry_failed_google_sheets_sync_jobs()','execute'),true,'authenticated cannot retry jobs');
select ok(has_function_privilege('service_role','public.claim_google_sheets_sync_jobs(integer)','execute'),'service role can claim jobs');

insert into auth.users(id,email,raw_user_meta_data) values
  ('90000000-0000-4000-8000-000000000001','queue-admin@example.com','{}'::jsonb);
update public.profiles set role='admin',is_active=true where id='90000000-0000-4000-8000-000000000001';
insert into public.surveys(id,name,slug,status,owner_user_id,created_by,updated_by) values
  ('91000000-0000-4000-8000-000000000001','Queue Survey','queue-survey','published','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001');
insert into public.survey_versions(id,survey_id,version,status,config,created_by,published_at) values
  ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',1,'published','{}','90000000-0000-4000-8000-000000000001',now());
update public.surveys set current_published_version_id='92000000-0000-4000-8000-000000000001' where id='91000000-0000-4000-8000-000000000001';
insert into public.responses(id,survey_id,survey_version_id) values
  ('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001');

set local role service_role;
create temporary table claimed_job as
  select response_id,lock_token from public.claim_google_sheets_sync_jobs(1);
select results_eq('select count(*) from claimed_job',array[1::bigint],'eligible job is claimed once');
select results_eq($$select attempts from public.google_sheets_sync_queue where response_id='93000000-0000-4000-8000-000000000001'$$,array[1],'claim increments attempts');
select ok((select lock_token is not null from public.google_sheets_sync_queue where response_id='93000000-0000-4000-8000-000000000001'),'claim generates lock token');
select results_eq('select count(*) from public.claim_google_sheets_sync_jobs(1)',array[0::bigint],'active lease prevents duplicate claim');
select isnt(public.complete_google_sheets_sync_job('93000000-0000-4000-8000-000000000001',gen_random_uuid(),200),true,'wrong token cannot complete');
select is(
  public.fail_google_sheets_sync_job('93000000-0000-4000-8000-000000000001',(select lock_token from claimed_job),'temporary',503),
  'pending',
  'retryable failure returns job to pending'
);
select ok((select next_attempt_at between now()+interval '50 seconds' and now()+interval '70 seconds' from public.google_sheets_sync_queue where response_id='93000000-0000-4000-8000-000000000001'),'first retry uses one minute backoff');

update public.google_sheets_sync_queue set next_attempt_at=now() where response_id='93000000-0000-4000-8000-000000000001';
truncate claimed_job;
insert into claimed_job select response_id,lock_token from public.claim_google_sheets_sync_jobs(1);
select ok(public.complete_google_sheets_sync_job('93000000-0000-4000-8000-000000000001',(select lock_token from claimed_job),200),'matching token completes job');
select results_eq($$select status from public.google_sheets_sync_queue where response_id='93000000-0000-4000-8000-000000000001'$$,array['synced'::text],'completed job is synced');

insert into public.responses(id,survey_id,survey_version_id) values
  ('93000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001');
update public.google_sheets_sync_queue set status='processing',attempts=11,lock_token=gen_random_uuid(),lease_expires_at=now()-interval '1 second' where response_id='93000000-0000-4000-8000-000000000002';
truncate claimed_job;
insert into claimed_job select response_id,lock_token from public.claim_google_sheets_sync_jobs(1);
select results_eq('select response_id from claimed_job',array['93000000-0000-4000-8000-000000000002'::uuid],'stale processing lease is reclaimed');
select is(
  public.fail_google_sheets_sync_job('93000000-0000-4000-8000-000000000002',(select lock_token from claimed_job),'permanent',500),
  'failed',
  'twelfth failed attempt becomes terminal failed'
);

select * from finish();
rollback;
