-- Record each response's identity choice (anonymous/identified) and respondent name
-- in responses.metadata. No new columns/tables are needed. The identity mode is read
-- from the submitted version's config at submission time (respondent_choice/
-- anonymous_only/identified_only, with the same anonymous boolean fallback the app
-- layer uses), and re-validated here so a direct RPC call cannot bypass the app's
-- identity requirements.
create or replace function public.submit_survey_response(
  p_slug text,
  p_version_id uuid,
  p_answers jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.surveys;
  v_config jsonb;
  identity_mode text;
  clean_identity_choice text;
  clean_respondent_name text;
  r_id uuid;
  q public.questions;
  v jsonb;
  max_score integer;
  score numeric;
  total numeric := 0;
  score_count integer := 0;
  clean_metadata jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 100000 then
    raise exception '回答形式が不正です';
  end if;
  if p_metadata is null then p_metadata := '{}'::jsonb; end if;
  if jsonb_typeof(p_metadata) <> 'object' or pg_column_size(p_metadata) > 10000 then
    raise exception 'メタデータが不正です';
  end if;
  clean_metadata := jsonb_strip_nulls(jsonb_build_object(
    'user_agent', case when jsonb_typeof(p_metadata->'user_agent') = 'string' then to_jsonb(left(p_metadata->>'user_agent', 300)) end,
    'needsFollowUp', case when jsonb_typeof(p_metadata->'needsFollowUp') = 'boolean' then p_metadata->'needsFollowUp' end,
    'matchedRuleId', case when jsonb_typeof(p_metadata->'matchedRuleId') = 'string' then to_jsonb(left(p_metadata->>'matchedRuleId', 100)) end,
    'reviewEligible', case when jsonb_typeof(p_metadata->'reviewEligible') = 'boolean' then p_metadata->'reviewEligible' end,
    'googleSheetsSyncToken', case when jsonb_typeof(p_metadata->'googleSheetsSyncToken') = 'string' then to_jsonb(left(p_metadata->>'googleSheetsSyncToken', 100)) end
  ));

  select * into s from public.surveys
    where slug = p_slug and status = 'published' and current_published_version_id = p_version_id;
  if s.id is null then raise exception 'このアンケートは公開されていません'; end if;

  select config into v_config from public.survey_versions where id = p_version_id;

  identity_mode := v_config->>'identityMode';
  if identity_mode is null or identity_mode not in ('respondent_choice', 'anonymous_only', 'identified_only') then
    identity_mode := case
      when v_config->>'anonymous' = 'true' then 'anonymous_only'
      when v_config->>'anonymous' = 'false' then 'identified_only'
      else 'identified_only'
    end;
  end if;

  if identity_mode = 'anonymous_only' then
    clean_identity_choice := 'anonymous';
    clean_respondent_name := null;
  elsif identity_mode = 'identified_only' then
    clean_identity_choice := 'identified';
    clean_respondent_name := nullif(trim(both from left(coalesce(p_metadata->>'respondentName', ''), 100)), '');
    if clean_respondent_name is null then raise exception 'お名前を入力してください'; end if;
  else
    clean_identity_choice := p_metadata->>'identityChoice';
    if clean_identity_choice is null or clean_identity_choice not in ('anonymous', 'identified') then raise exception '回答方法が不正です'; end if;
    if clean_identity_choice = 'identified' then
      clean_respondent_name := nullif(trim(both from left(coalesce(p_metadata->>'respondentName', ''), 100)), '');
      if clean_respondent_name is null then raise exception 'お名前を入力してください'; end if;
    else
      clean_respondent_name := null;
    end if;
  end if;

  clean_metadata := clean_metadata || jsonb_strip_nulls(jsonb_build_object(
    'identityChoice', to_jsonb(clean_identity_choice),
    'respondentName', case when clean_respondent_name is not null then to_jsonb(clean_respondent_name) end
  ));

  if exists (
    select 1 from jsonb_object_keys(p_answers) key
    where not exists (select 1 from public.questions where survey_version_id = p_version_id and id::text = key)
  ) then raise exception '不明な質問です'; end if;

  for q in select * from public.questions where survey_version_id = p_version_id order by sort_order loop
    v := p_answers -> q.id::text;
    if q.required and (v is null or v = 'null'::jsonb or v = '""'::jsonb or v = '[]'::jsonb) then
      raise exception '必須項目が未回答です';
    end if;
    if v is null or v = 'null'::jsonb then continue; end if;

    if q.type = 'rating_10' then
      max_score := case when q.settings->>'maxScore' = '5' then 5 else 10 end;
      if jsonb_typeof(v) <> 'number' then raise exception '評価値が不正です'; end if;
      score := (v #>> '{}')::numeric;
      if score <> trunc(score) or score not between 1 and max_score then raise exception '評価値が不正です'; end if;
      total := total + score; score_count := score_count + 1;
    elsif q.type = 'single_choice' then
      if jsonb_typeof(v) <> 'string' or not exists (select 1 from public.question_options o where o.question_id = q.id and o.value = v #>> '{}') then
        raise exception '選択値が不正です';
      end if;
    elsif q.type = 'multiple_choice' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 50 or exists (
        select 1 from jsonb_array_elements(v) item
        where jsonb_typeof(item) <> 'string' or not exists (select 1 from public.question_options o where o.question_id = q.id and o.value = item #>> '{}')
      ) then raise exception '複数選択値が不正です'; end if;
    elsif q.type = 'text' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 1000 then raise exception 'テキストが長すぎます'; end if;
    elsif q.type = 'textarea' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 5000 then raise exception 'テキストが長すぎます'; end if;
    end if;
  end loop;

  insert into public.responses(survey_id,survey_version_id,total_score,average_score,metadata)
    values(s.id,p_version_id,total,case when score_count > 0 then round(total/score_count,2) end,clean_metadata)
    returning id into r_id;
  for q in select * from public.questions where survey_version_id = p_version_id loop
    v := p_answers -> q.id::text;
    if v is not null and v <> 'null'::jsonb then
      insert into public.response_answers(response_id,question_id,value_text,value_number,value_json)
      values(r_id,q.id,case when jsonb_typeof(v)='string' then v#>>'{}' end,case when q.type='rating_10' then (v#>>'{}')::numeric end,case when jsonb_typeof(v) in ('array','object') then v end);
    end if;
  end loop;
  return r_id;
end $$;
