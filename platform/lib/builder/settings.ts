import type {AnswerValue, BuilderContext, GoogleReviewRule, IdentityMode, SurveyConfig, SurveyQuestion} from '@/types/database';
import {defaultConfig, scoreMax} from '@/lib/survey';
import {getThemeTemplate, themeIdForBusiness} from '@/lib/theme/templates';
import {safeGoogleReviewUrl} from '@/lib/google-review';
import {validateGoogleReviewRuleForQuestions, validateRulesForQuestions} from '@/lib/completion-validation';

export const industries=['クリニック','飲食店','美容室','サロン','小売','宿泊','その他'];
export const prefectures='北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ');
export function recommendedReviewRule(questions:SurveyQuestion[]):GoogleReviewRule {
  return {logic:'or',conditions:questions.filter(q=>q.type==='rating_10').map(q=>({questionId:q.id,operator:'gte',value:Math.min(9,scoreMax(q))}))};
}
export function reviewRuleDescription(rule:GoogleReviewRule|null|undefined,questions:SurveyQuestion[]) {
  if(!rule?.conditions.length)return 'スコア条件を追加してください。';
  const phrases=rule.conditions.map(c=>`「${questions.find(q=>q.id===c.questionId)?.title??'削除された質問'}」が${c.value}点${{gte:'以上',lte:'以下',eq:'と等しい'}[c.operator]}`);
  return `${phrases.join('、')}という条件を${rule.logic==='and'?'すべて':'いずれか1つ'}満たす場合にGoogle口コミをご案内します。`;
}
export function reviewComment(config:SurveyConfig,questions:SurveyQuestion[],answers:Record<string,AnswerValue>):string {
  if(config.reviewTextQuestionId===null)return '';
  const candidates=questions.filter(q=>q.type==='textarea'&&(config.reviewTextQuestionId===undefined||q.id===config.reviewTextQuestionId));
  const value=candidates.map(q=>answers[q.id]).find(v=>typeof v==='string'&&v.trim());
  return typeof value==='string'?value:'';
}
const IDENTITY_MODES:IdentityMode[]=['respondent_choice','anonymous_only','identified_only'];

// identityMode is the single source of truth for a survey's anonymous/named
// behavior. New sessions default to respondent_choice; sessions saved before the
// 3-mode setting existed (identityMode/config.identityMode absent, only the old
// anonymous boolean present) convert once here instead of re-asking the admin.
export function resolveBuilderIdentityMode(context:BuilderContext):IdentityMode {
  if(context.identityMode&&IDENTITY_MODES.includes(context.identityMode))return context.identityMode;
  if(context.config?.identityMode&&IDENTITY_MODES.includes(context.config.identityMode))return context.config.identityMode;
  if(context.anonymous===true)return 'anonymous_only';
  if(context.anonymous===false)return 'identified_only';
  return 'respondent_choice';
}

export function builderConfig(context:BuilderContext):SurveyConfig {
  const theme=getThemeTemplate(context.themeId??themeIdForBusiness(context.businessType??'other'));
  const identityMode=resolveBuilderIdentityMode(context);
  const config:SurveyConfig={
    ...defaultConfig,
    ...theme.config,
    themeId:theme.id,
    title:context.heroTitle??theme.config.heroTitle,
    heroTitle:context.heroTitle??theme.config.heroTitle,
    heroSubtitle:context.heroSubtitle??theme.config.heroSubtitle,
    heroLabel:context.heroLabel??'QUESTIONNAIRE',
    description:'',
    introText:context.introText??'',
    completionText:context.completionText??theme.config.completionText,
    questionFontSize:context.questionFontSize??17,
    primaryColor:context.mainColor??theme.config.primaryColor,
    buttonBackground:context.mainColor??theme.config.buttonBackground,
    logoMode:context.logoMode??'none',
    logoUrl:context.logoUrl??null,
    googleReviewMode:context.googleReviewMode??(context.googleReviewEnabled?'all':'disabled'),
    googleReviewUrl:context.googleReviewUrl??null,
    googleReviewRule:context.googleReviewRule??null,
    ...context.config,
    identityMode,
    anonymous:identityMode==='anonymous_only',
    anonymousText:identityMode==='anonymous_only'?(context.config?.anonymousText??defaultConfig.anonymousText):'',
    businessCategory:context.businessCategory??context.config?.businessCategory??'',
    prefecture:context.prefecture??context.config?.prefecture??'',
  };
  const legacyDescription=config.description?.trim()??'';
  if(legacyDescription){
    if(!config.introText?.trim()&&config.heroSubtitle?.trim()!==legacyDescription)config.introText=config.description;
    config.description='';
  }
  return config;
}
export function validateReviewSettings(config:SurveyConfig,questions:SurveyQuestion[]):string|null {
  if(config.googleReviewMode!=='disabled'&&!safeGoogleReviewUrl(config.googleReviewUrl))return 'Google口コミURLを入力してください。';
  if(config.googleReviewMode==='score') {if(!config.googleReviewRule?.conditions.length)return '口コミのスコア条件を設定してください。';const error=validateGoogleReviewRuleForQuestions(config.googleReviewRule,questions);if(error)return error;}
  if(config.reviewTextQuestionId&&!questions.some(q=>q.id===config.reviewTextQuestionId&&q.type==='textarea'))return '口コミ用文章には現在の長文質問を選択してください。';
  return validateRulesForQuestions(
    (config.completionRules??[]).map(rule=>({...rule,needsFollowUp:Boolean(rule.needsFollowUp)})),
    questions,
  );
}
/** A copied version gets new question IDs; all question references must follow it. */
export function remapConfigQuestions(config:SurveyConfig,idMap:Record<string,string>):SurveyConfig {
  const rule=(r:GoogleReviewRule)=>({...r,conditions:r.conditions.map(c=>({...c,questionId:idMap[c.questionId]??c.questionId}))});
  return {...config,...(config.googleReviewRule?{googleReviewRule:rule(config.googleReviewRule)}:{}),...(config.completionRules?{completionRules:config.completionRules.map(r=>({...r,...rule(r)}))}:{}),...(config.reviewTextQuestionId?{reviewTextQuestionId:idMap[config.reviewTextQuestionId]??config.reviewTextQuestionId}:{})};
}
