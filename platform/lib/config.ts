import type { CompletionRule, GoogleReviewMode, GoogleReviewRule, SurveyConfig } from '@/types/database';

export function mergeSurveyConfig(existing: SurveyConfig, edited: Partial<SurveyConfig>): SurveyConfig {
  return { ...existing, ...edited };
}

export function completionSettingsConfig(
  existing: SurveyConfig,
  reviewMode: GoogleReviewMode,
  reviewUrl: string,
  completionRules: CompletionRule[],
  googleReviewRule: GoogleReviewRule | null = null,
): SurveyConfig {
  const preserved = { ...existing } as SurveyConfig & { googleReviewRules?: unknown };
  delete preserved.googleReviewRules;
  return {
    ...preserved,
    googleReviewMode: reviewMode,
    googleReviewUrl: reviewMode === 'disabled' ? null : reviewUrl,
    googleReviewRule: reviewMode === 'score' ? googleReviewRule : null,
    completionRules,
  };
}
