begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(23);

-- Stable UUIDs make failures readable while the transaction keeps every run isolated.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'admin-test@crestix-inc.com', '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000002', 'staff-a@crestix-inc.com', '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000003', 'staff-b@crestix-inc.com', '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000004', 'viewer-a@crestix-inc.com', '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000005', 'inactive@crestix-inc.com', '{}'::jsonb);

update public.profiles set role = 'admin', is_active = true where id = '00000000-0000-4000-8000-000000000001';
update public.profiles set role = 'sales', is_active = true where id in (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003'
);
update public.profiles set role = 'viewer', is_active = true where id = '00000000-0000-4000-8000-000000000004';
update public.profiles set role = 'sales', is_active = false where id = '00000000-0000-4000-8000-000000000005';

insert into public.surveys (id, name, slug, status, owner_user_id, created_by, updated_by) values
  ('10000000-0000-4000-8000-000000000001', 'Survey A', 'ci-survey-a', 'published', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'Survey B', 'ci-survey-b', 'draft', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');

insert into public.survey_versions (id, survey_id, version, status, config, created_by, published_at) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'published', '{}'::jsonb, '00000000-0000-4000-8000-000000000001', now()),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1, 'draft', '{}'::jsonb, '00000000-0000-4000-8000-000000000001', null);

update public.surveys set current_published_version_id = '20000000-0000-4000-8000-000000000001', published_at = now()
where id = '10000000-0000-4000-8000-000000000001';
update public.surveys set current_draft_version_id = '20000000-0000-4000-8000-000000000002'
where id = '10000000-0000-4000-8000-000000000002';

insert into public.questions (id, survey_version_id, type, title, required, sort_order, settings) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'rating_10', 'Rating A', true, 1, '{"maxScore":10}'::jsonb),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'text', 'Text B', false, 1, '{}'::jsonb);

insert into public.responses (id, survey_id, survey_version_id, total_score, average_score) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 9, 9);
insert into public.response_answers (response_id, question_id, value_number) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 9);

insert into public.survey_members (survey_id, user_id, permission, invited_by) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'viewer', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'editor', '00000000-0000-4000-8000-000000000001');

insert into public.builder_sessions (id, user_id, survey_id, status, context, current_step) values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'in_progress', '{}'::jsonb, 'purpose'),
  ('50000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'in_progress', '{}'::jsonb, 'purpose');

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select results_eq('select count(*) from public.surveys', array[2::bigint], 'admin reads Survey A and B');
select ok(public.can_edit_survey('10000000-0000-4000-8000-000000000001'), 'admin edits Survey A');
select ok(public.can_edit_survey('10000000-0000-4000-8000-000000000002'), 'admin edits Survey B');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select results_eq('select count(*) from public.surveys', array[1::bigint], 'STAFF_A reads only owned Survey A');
select ok(public.can_edit_survey('10000000-0000-4000-8000-000000000001'), 'STAFF_A edits Survey A');
select isnt(public.can_edit_survey('10000000-0000-4000-8000-000000000002'), true, 'STAFF_A cannot edit Survey B');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select results_eq('select count(*) from public.surveys', array[1::bigint], 'STAFF_B reads only owned Survey B');
select isnt(public.can_edit_survey('10000000-0000-4000-8000-000000000001'), true, 'STAFF_B cannot edit Survey A');
select ok(public.can_edit_survey('10000000-0000-4000-8000-000000000002'), 'STAFF_B edits Survey B');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select results_eq('select count(*) from public.surveys', array[1::bigint], 'VIEWER_A reads only shared Survey A');
select results_eq('select count(*) from public.responses', array[1::bigint], 'VIEWER_A reads Survey A responses');
select lives_ok($$ select public.get_survey_analytics('10000000-0000-4000-8000-000000000001') $$, 'VIEWER_A reads Survey A analytics');
select isnt(public.can_edit_survey('10000000-0000-4000-8000-000000000001'), true, 'VIEWER_A cannot edit Survey A');
select results_eq(
  $$ update public.surveys set name = 'Viewer must not edit' where id = '10000000-0000-4000-8000-000000000001' returning id $$,
  $$ select id from public.surveys where false $$,
  'VIEWER_A update is filtered by RLS'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
select results_eq('select count(*) from public.surveys', array[0::bigint], 'inactive user reads no surveys despite editor membership');
select results_eq('select count(*) from public.responses', array[0::bigint], 'inactive user reads no responses');
select results_eq('select count(*) from public.builder_sessions', array[0::bigint], 'inactive user cannot read own builder session');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select results_eq('select count(*) from public.surveys', array[1::bigint], 'anonymous reads only published surveys');
select results_eq('select count(*) from public.survey_versions', array[1::bigint], 'anonymous reads only published versions');
select isnt(has_table_privilege('anon', 'public.survey_members', 'select'), true, 'anonymous has no survey_members access');
select isnt(has_table_privilege('anon', 'public.survey_invitations', 'select'), true, 'anonymous has no survey_invitations access');
select results_eq('select count(*) from public.responses', array[0::bigint], 'anonymous cannot read responses');
select results_eq('select count(*) from public.builder_sessions', array[0::bigint], 'anonymous cannot read builder sessions');

select * from finish();
rollback;
