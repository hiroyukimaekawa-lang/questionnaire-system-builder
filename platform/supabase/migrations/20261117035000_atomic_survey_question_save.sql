-- Save all question edits atomically. A failed insert rolls back the earlier
-- DELETE, preventing the next draft from becoming an empty questionnaire.
-- The function is SECURITY INVOKER; survey edit permissions and RLS apply.
create or replace function public.save_survey_questions_atomic(
  p_survey_id uuid, p_version_id uuid, p_questions jsonb
) returns jsonb
language plpgsql security invoker
set search_path = 'public'
as $$
declare
  v_current uuid;
  v_draft_status public.version_status;
  v_row jsonb;
  v_item jsonb;
  v_option jsonb;
  v_mapping jsonb := '[]'::jsonb;
  v_existing uuid;
  v_requested uuid;
  v_target uuid;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_index int := 0;
  v_option_index int;
  v_count int;
begin
  if auth.uid() is null or not coalesce(public.can_edit_survey(p_survey_id),false) then
    raise exception '質問の編集権限がありません';
  end if;

  select current_draft_version_id into v_current
    from public.surveys where id=p_survey_id and status<>'archived'
    for update;
  if v_current is null or v_current<>p_version_id then
    raise exception '編集中の下書きが更新されています。画面を再読み込みしてください';
  end if;
  select status into v_draft_status from public.survey_versions
    where id=p_version_id and survey_id=p_survey_id for update;
  if v_draft_status is distinct from 'draft'::public.version_status then
    raise exception '下書きが見つかりません';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception '質問の形式が不正です';
  end if;
  v_count:=jsonb_array_length(p_questions);
  if v_count<1 or v_count>100 then raise exception '質問は1〜100件で保存してください'; end if;

  -- Build new identities BEFORE deleting anything. Existing draft question IDs
  -- remain stable. IDs belonging to a previously published version are replaced.
  for v_item in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or length(trim(coalesce(v_item->>'title','')))=0
      or length(v_item->>'title')>3000
      or coalesce(v_item->>'type','') not in
        ('text','textarea','single_choice','multiple_choice','rating_10')
      or jsonb_typeof(v_item->'settings') is distinct from 'object'
      or jsonb_typeof(v_item->'options') is distinct from 'array'
      or jsonb_typeof(v_item->'required') is distinct from 'boolean'
      or jsonb_array_length(v_item->'options')>50 then
        raise exception '質問の入力内容が不正です';
    end if;
    v_requested:=(v_item->>'id')::uuid;
    if v_requested=any(v_seen) then raise exception '質問IDが重複しています'; end if;
    v_seen:=array_append(v_seen,v_requested);
    select id into v_existing from public.questions
      where id=v_requested and survey_version_id=p_version_id;
    if v_existing is null then
      -- A tab left open across publication may still submit the published ID.
      -- Reuse the already-created draft ID at the same position and type
      -- so its completion-rule references remain valid.
      select d.id into v_existing
        from public.surveys s
        join public.questions p on p.survey_version_id=s.current_published_version_id
          and p.id=v_requested and p.sort_order=v_index
        join public.questions d on d.survey_version_id=p_version_id
          and d.sort_order=v_index and d.type=p.type
        where s.id=p_survey_id and d.type::text=v_item->>'type';
    end if;
    v_target:=coalesce(v_existing,gen_random_uuid());
    v_mapping:=v_mapping || jsonb_build_array(
      jsonb_build_object('id',v_target::text,'originalId',v_requested::text,'question',v_item)
    );
    v_index:=v_index+1;
  end loop;
  v_index:=0;

  -- All changes below are a single PostgreSQL transaction. Any exception rolls
  -- back both deletion and insertion, including the existing option rows.
  delete from public.questions where survey_version_id=p_version_id;
  for v_row in select value from jsonb_array_elements(v_mapping) loop
    v_item:=v_row->'question';
    v_target:=(v_row->>'id')::uuid;
    insert into public.questions
      (id,survey_version_id,type,title,description,required,sort_order,settings)
    values
      (v_target,p_version_id,(v_item->>'type')::public.question_type,
       trim(v_item->>'title'),trim(coalesce(v_item->>'description','')),
       (v_item->>'required')::boolean,v_index,v_item->'settings');

    if v_item->>'type' in ('single_choice','multiple_choice') then
      v_option_index:=0;
      for v_option in select value from jsonb_array_elements(v_item->'options') loop
        if jsonb_typeof(v_option) is distinct from 'object'
          or length(trim(coalesce(v_option->>'label','')))=0 then
          raise exception '選択肢の入力内容が不正です';
        end if;
        insert into public.question_options(question_id,label,value,sort_order)
        values(v_target,trim(v_option->>'label'),
          coalesce(nullif(trim(v_option->>'value'),''),'option-'||(v_option_index+1)::text),
          v_option_index);
        v_option_index:=v_option_index+1;
      end loop;
    end if;
    v_index:=v_index+1;
  end loop;
  return jsonb_build_object('saved',v_count,'idMapping',
    (select coalesce(jsonb_agg(jsonb_build_object(
      'originalId',value->>'originalId','id',value->>'id')),'[]'::jsonb)
     from jsonb_array_elements(v_mapping)));
end
$$;

revoke all on function public.save_survey_questions_atomic(uuid,uuid,jsonb) from public,anon;
grant execute on function public.save_survey_questions_atomic(uuid,uuid,jsonb) to authenticated;
