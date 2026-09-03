import type { CompletionRule, GoogleReviewMode, SurveyConfig } from '@/types/database';

export function mergeSurveyConfig(existing: SurveyConfig, edited: Partial<SurveyConfig>): SurveyConfig {
  return { ...existing, ...edited };
}

export function completionSettingsConfig(existing:SurveyConfig,reviewMode:GoogleReviewMode,reviewUrl:string,completionRules:CompletionRule[]):SurveyConfig{
  const preserved={...existing} as SurveyConfig&{googleReviewRules?:unknown};
  delete preserved.googleReviewRules;
  return {...preserved,googleReviewMode:reviewMode,googleReviewUrl:reviewMode==='all'?reviewUrl:null,completionRules};
}
