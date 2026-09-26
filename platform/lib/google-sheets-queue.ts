import type {SupabaseClient} from '@supabase/supabase-js';
import type {AnswerValue, SurveyConfig} from '../types/database';
import type {GoogleSheetsPayload} from './google-sheets-sync';

type ResponseRow = {
  id: string;
  survey_id: string;
  survey_version_id: string;
  submitted_at: string;
  total_score: number | null;
  average_score: number | null;
  metadata: Record<string, unknown> | null;
};

function answerValue(row: {value_text: string | null; value_number: number | null; value_json: unknown}): AnswerValue {
  if (row.value_number !== null) return Number(row.value_number);
  if (Array.isArray(row.value_json)) return row.value_json.map(String);
  if (row.value_json !== null && row.value_json !== undefined) return row.value_json as AnswerValue;
  return row.value_text ?? '';
}

function optionLabels(value: AnswerValue, options: Array<{value: string; label: string}>): AnswerValue {
  const labels = new Map(options.map(option => [option.value, option.label]));
  if (Array.isArray(value)) return value.map(item => labels.get(item) ?? item);
  if (typeof value === 'string') return labels.get(value) ?? value;
  return value;
}

export async function buildGoogleSheetsPayloadFromResponse(
  client: SupabaseClient,
  responseId: string,
): Promise<GoogleSheetsPayload> {
  const {data:responseData,error:responseError}=await client.from('responses')
    .select('id,survey_id,survey_version_id,submitted_at,total_score,average_score,metadata')
    .eq('id',responseId).single();
  if(responseError||!responseData)throw new Error(`Response not found: ${responseError?.message??responseId}`);
  const response=responseData as ResponseRow;

  const [{data:survey,error:surveyError},{data:version,error:versionError},{data:questions,error:questionsError},{data:answers,error:answersError}]=await Promise.all([
    client.from('surveys').select('id,name,slug,industry,status').eq('id',response.survey_id).single(),
    client.from('survey_versions').select('id,version,config').eq('id',response.survey_version_id).single(),
    client.from('questions').select('id,title,type,sort_order,question_options(value,label,sort_order)').eq('survey_version_id',response.survey_version_id).order('sort_order'),
    client.from('response_answers').select('question_id,value_text,value_number,value_json').eq('response_id',response.id),
  ]);
  if(surveyError||!survey)throw new Error(`Survey not found: ${surveyError?.message??response.survey_id}`);
  if(versionError||!version)throw new Error(`Survey version not found: ${versionError?.message??response.survey_version_id}`);
  if(questionsError)throw new Error(`Questions could not be loaded: ${questionsError.message}`);
  if(answersError)throw new Error(`Answers could not be loaded: ${answersError.message}`);

  const config=(version.config??{}) as SurveyConfig;
  const metadata=response.metadata??{};
  const answerByQuestion=new Map((answers??[]).map(row=>[row.question_id,row]));
  const payloadAnswers=(questions??[]).flatMap(question=>{
    const row=answerByQuestion.get(question.id);
    if(!row)return [];
    const raw=answerValue(row);
    const options=[...(question.question_options??[])].sort((a,b)=>a.sort_order-b.sort_order);
    const value=optionLabels(raw,options);
    return [{
      questionId:question.id,
      questionTitle:question.title,
      questionType:question.type,
      value,
      score:question.type==='rating_10'&&typeof raw==='number'?raw:null,
    }];
  });

  const reviewEligible=metadata.reviewEligible===true;
  const needsFollowUp=metadata.needsFollowUp===true;
  return {
    store:{
      id:survey.id,
      name:survey.name,
      industry:survey.industry,
      slug:survey.slug,
      status:survey.status,
      googleReviewUrl:config.googleReviewUrl||'',
    },
    response:{
      id:response.id,
      submittedAt:response.submitted_at,
      surveyName:config.title?.trim()||`${survey.name} アンケート`,
      version:Number(version.version),
      averageScore:response.average_score===null?null:Number(response.average_score),
      totalScore:response.total_score===null?null:Number(response.total_score),
      reviewEligible,
      needsFollowUp,
    },
    answers:payloadAnswers,
    events:[{
      id:`${response.id}:response_submitted`,
      createdAt:response.submitted_at,
      type:'response_submitted',
      metadata:{reviewEligible,needsFollowUp},
    }],
  };
}
