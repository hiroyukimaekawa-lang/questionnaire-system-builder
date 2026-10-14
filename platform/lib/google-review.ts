import type {AnswerValue,SurveyConfig,SurveyQuestion} from '@/types/database';
import {googleReviewMode} from '@/lib/survey';

export function evaluateGoogleReviewEligibility(
  config:SurveyConfig,
  _questions:SurveyQuestion[],
  _answers:Record<string,AnswerValue>,
) {
  void _questions;
  void _answers;
  return googleReviewMode(config)!=='disabled'&&Boolean(safeGoogleReviewUrl(config.googleReviewUrl));
}

/** Only navigable web URLs are allowed, including for legacy stored config. */
export function safeGoogleReviewUrl(value:string|null|undefined):string|null {
  if(!value)return null;
  try {const url=new URL(value);return url.protocol==='https:'||url.protocol==='http:'?url.href:null;} catch {return null;}
}
