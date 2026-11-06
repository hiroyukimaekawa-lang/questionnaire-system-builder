import type {AnswerValue,SurveyConfig,SurveyQuestion} from '@/types/database';
import {googleReviewMode} from '@/lib/survey';
import {evaluateCompletionRules} from '@/lib/completion';

/** Historical score surveys may have saved rules before an explicit gate flag existed. */
export function isGoogleReviewScoreGated(config:SurveyConfig):boolean {
  if(googleReviewMode(config)!=='score')return false;
  if(config.scoreGatesGoogleReview!==undefined)return config.scoreGatesGoogleReview===true;
  return Boolean(config.completionRules?.length||config.googleReviewRule?.conditions?.length);
}

export function evaluateGoogleReviewEligibility(
  config:SurveyConfig,
  questions:SurveyQuestion[],
  answers:Record<string,AnswerValue>,
) {
  const mode=googleReviewMode(config);
  if(mode==='disabled'||!safeGoogleReviewUrl(config.googleReviewUrl))return false;
  if(isGoogleReviewScoreGated(config)){
    const result=evaluateCompletionRules(config,answers,questions);
    return result.matchedRuleId!==null&&!result.needsFollowUp;
  }
  return true;
}

/** Only navigable web URLs are allowed, including for legacy stored config. */
export function safeGoogleReviewUrl(value:string|null|undefined):string|null {
  if(!value)return null;
  try {const url=new URL(value);return url.protocol==='https:'||url.protocol==='http:'?url.href:null;} catch {return null;}
}
