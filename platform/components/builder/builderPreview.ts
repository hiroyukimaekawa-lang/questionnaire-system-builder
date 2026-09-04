import {defaultCompletionText, defaultIntroText} from '@/lib/builder/engine';
import {defaultConfig} from '@/lib/survey';
import {getThemeTemplate, themeIdForBusiness} from '@/lib/theme/templates';
import type {BuilderContext, SurveyQuestion, SurveyVersion} from '@/types/database';

const emptyQuestion:SurveyQuestion={
  id:'builder-empty-question',
  type:'text',
  title:'ここに質問が表示されます',
  description:'入力が進むと、選んだ質問がリアルタイムで反映されます。',
  required:false,
  sortOrder:0,
  settings:{placeholder:'回答欄のプレビュー'},
  options:[],
};

export function buildBuilderPreviewVersion(context:BuilderContext):SurveyVersion{
  const theme=getThemeTemplate(context.themeId??themeIdForBusiness(context.businessType??'other'));
  const reviewEnabled=context.googleReviewEnabled===true&&Boolean(context.googleReviewUrl);
  return {
    id:'builder-preview',surveyId:'builder-preview',version:1,status:'draft',
    config:{
      ...defaultConfig,
      ...theme.config,
      themeId:theme.id,
      title:context.storeName?`${context.storeName} お客様アンケート`:theme.config.heroTitle,
      heroTitle:context.heroTitle??theme.config.heroTitle,
      heroSubtitle:theme.config.heroSubtitle,
      introText:context.introText??defaultIntroText(context.anonymous??true),
      anonymousText:context.anonymous===false?'回答内容は運営者が確認します。':defaultConfig.anonymousText,
      completionText:context.completionText??defaultCompletionText,
      primaryColor:context.mainColor??theme.config.primaryColor,
      buttonBackground:context.mainColor??theme.config.buttonBackground,
      logoMode:context.logoMode??theme.config.logoMode,
      logoUrl:context.logoUrl??null,
      googleReviewUrl:reviewEnabled?context.googleReviewUrl??null:null,
      googleReviewMode:reviewEnabled?'all':'disabled',
    },
    questions:context.questions?.length?context.questions:[emptyQuestion],
  };
}

export type BuilderPreviewEditTarget={kind:'step';stepId:string}|{kind:'question';questionId:string};

export function resolveBuilderPreviewTarget(target:string,context:BuilderContext):BuilderPreviewEditTarget|null{
  if(target.startsWith('question-')){
    const questionId=target.slice('question-'.length);
    return context.questions?.some(question=>question.id===questionId)?{kind:'question',questionId}:null;
  }
  const targets:Record<string,string>={
    name:'storeName',heroTitle:'heroTitle',heroSubtitle:'mainColor',anonymousText:'anonymous',introText:'introText',
    submitLabel:'mainColor',completionText:'completionText',
    googleReview:context.googleReviewEnabled?'googleReviewUrl':'googleReviewEnabled',
  };
  const stepId=targets[target];
  return stepId?{kind:'step',stepId}:null;
}

export function reopenBuilderStep(context:BuilderContext,stepId:string):BuilderContext{
  const next={...context};
  delete (next as Record<string,unknown>)[stepId];
  if(stepId==='businessType'){
    delete next.template;delete next.questions;delete next.questionsConfirmed;
  }
  if(stepId==='template'||stepId==='questions')delete next.questionsConfirmed;
  return next;
}
