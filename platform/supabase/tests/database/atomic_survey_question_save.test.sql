begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(9);

insert into auth.users(id,email,raw_user_meta_data) values
 ('aa100000-0000-4000-8000-000000000001','atomic-save-admin@example.test','{}'::jsonb);
update public.profiles set role='admin',is_active=true
 where id='aa100000-0000-4000-8000-000000000001';

insert into public.surveys(id,name,slug,status,owner_user_id,created_by,updated_by) values
 ('aa110000-0000-4000-8000-000000000001','Atomic Save Test','atomic-save-test','published',
  'aa100000-0000-4000-8000-000000000001','aa100000-0000-4000-8000-000000000001',
  'aa100000-0000-4000-8000-000000000001');
insert into public.survey_versions(id,survey_id,version,status,config,created_by,published_at) values
 ('aa120000-0000-4000-8000-000000000001','aa110000-0000-4000-8000-000000000001',1,'published','{}',
 'aa100000-0000-4000-8000-000000000001',now()),
 ('aa120000-0000-4000-8000-000000000002','aa110000-0000-4000-8000-000000000001',2,'draft','{}',
 'aa100000-0000-4000-8000-000000000001',null);
update public.surveys set current_published_version_id='aa120000-0000-4000-8000-000000000001',
 current_draft_version_id='aa120000-0000-4000-8000-000000000002'
 where id='aa110000-0000-4000-8000-000000000001';
insert into public.questions(id,survey_version_id,type,title,description,required,sort_order,settings) values
 ('aa130000-0000-4000-8000-000000000001','aa120000-0000-4000-8000-000000000001','text','①ご記入日','',true,0,'{}'),
 ('aa130000-0000-4000-8000-000000000002','aa120000-0000-4000-8000-000000000002','text','①ご記入日','',true,0,'{}');

set local role authenticated;
select set_config('request.jwt.claim.sub','aa100000-0000-4000-8000-000000000001',true);

select isnt(has_function_privilege('anon','public.save_survey_questions_atomic(uuid,uuid,jsonb)','execute'),true,'anon cannot invoke question save');
select ok(has_function_privilege('authenticated','public.save_survey_questions_atomic(uuid,uuid,jsonb)','execute'),'staff may invoke atomic save');

select lives_ok($$
  select public.save_survey_questions_atomic(
    'aa110000-0000-4000-8000-000000000001',
    'aa120000-0000-4000-8000-000000000002',
    jsonb_build_array(jsonb_build_object(
      'id','aa130000-0000-4000-8000-000000000002',
      'type','text','title','ご記入日','description','',
      'required',true,'settings','{}'::jsonb,'options','[]'::jsonb))
  )
$$,'Removing ① saves successfully');

select is((select title from public.questions where id='aa130000-0000-4000-8000-000000000002'),
 'ご記入日','draft title updated');
select is((select title from public.questions where id='aa130000-0000-4000-8000-000000000001'),
 '①ご記入日','published title remains unchanged');

-- Failure occurs after DELETE and INSERT started. Database transaction must restore all draft rows.
select throws_ok($$
  select public.save_survey_questions_atomic(
    'aa110000-0000-4000-8000-000000000001',
    'aa120000-0000-4000-8000-000000000002',
    jsonb_build_array(jsonb_build_object(
      'id','aa130000-0000-4000-8000-000000000002',
      'type','single_choice','title','壊れた選択肢','description','',
      'required',true,'settings','{}'::jsonb,
      'options',jsonb_build_array(jsonb_build_object('label','','value','x'))))
  )
$,'P0001','選択肢の入力内容が不正です','Invalid choice throws and rolls back deletion');
select is((select count(*) from public.questions where survey_version_id='aa120000-0000-4000-8000-000000000002'),
 1::bigint,'draft still contains a question after failed write');
select is((select title from public.questions where survey_version_id='aa120000-0000-4000-8000-000000000002'),
 'ご記入日','draft text survives the failed save');

-- Stale UI can send a published-version question ID. Generate a new draft ID.
select lives_ok($$
  select public.save_survey_questions_atomic(
    'aa110000-0000-4000-8000-000000000001',
    'aa120000-0000-4000-8000-000000000002',
    jsonb_build_array(jsonb_build_object(
      'id','aa130000-0000-4000-8000-000000000001',
      'type','text','title','ご記入日','description','',
      'required',true,'settings','{}'::jsonb,'options','[]'::jsonb))
  )
$$,'Published question ID is remapped instead of violating primary key');

select * from finish();
rollback;
