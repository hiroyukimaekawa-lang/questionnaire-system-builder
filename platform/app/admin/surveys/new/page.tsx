import {isAnonymousSurvey} from '@/lib/public-survey';
import { SurveyWizard } from '@/components/builder/SurveyWizard';
import { createClient } from '@/lib/supabase/server';
import { getDraftForSurvey, getSurvey } from '@/lib/data';
import type { BuilderBusinessType, BuilderContext } from '@/types/database';
import {remapConfigQuestions} from '@/lib/builder/settings';

export default async function NewSurvey({searchParams}:{searchParams:Promise<{session?:string;duplicate?:string}>}){
  const query=await searchParams;let initial:BuilderContext={};let sessionId:string|null=null;
  if(query.session){const s=await createClient();const {data}=await s.from('builder_sessions').select('id,context').eq('id',query.session).eq('status','in_progress').maybeSingle();if(data){initial=data.context as BuilderContext;sessionId=data.id;}}
  if(query.duplicate){const [survey,draft]=await Promise.all([getSurvey(query.duplicate),getDraftForSurvey(query.duplicate)]);if(survey&&draft){const businessType=(['clinic','restaurant','salon'].includes(survey.industry)?survey.industry:'other') as BuilderBusinessType;const idMap=Object.fromEntries(draft.questions.map(question=>[question.id,crypto.randomUUID()]));const questions=draft.questions.map(question=>({...question,id:idMap[question.id]}));const config=remapConfigQuestions(draft.config,idMap);initial={config,businessCategory:config.businessCategory,prefecture:config.prefecture,industry:survey.industry,purpose:'satisfaction',storeName:`${survey.name} のコピー`,businessType,startingPoint:'decided',template:'custom',questions,questionsConfirmed:true,anonymous:isAnonymousSurvey(config),introText:config.introText,mainColor:config.primaryColor,themeId:config.themeId,logoMode:config.logoMode??(config.logoUrl?'upload':'none'),logoUrl:config.logoUrl,googleReviewEnabled:Boolean(config.googleReviewUrl),googleReviewMode:config.googleReviewMode,googleReviewRule:config.googleReviewRule,googleReviewUrl:config.googleReviewUrl,completionText:config.completionText,sourceSurveyId:survey.id};}}
  return <SurveyWizard initial={initial} initialSessionId={sessionId}/>;
}
