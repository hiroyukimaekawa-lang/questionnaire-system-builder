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
  scoreGatesGoogleReview?: boolean,
): SurveyConfig {
  const preserved = { ...existing };
  return {
    ...preserved,
    googleReviewMode: reviewMode,
    googleReviewUrl: reviewMode === 'disabled' ? null : reviewUrl,
    googleReviewRule: reviewMode === 'score' ? googleReviewRule : null,
    ...(scoreGatesGoogleReview === undefined ? {} : { scoreGatesGoogleReview: reviewMode === 'score' && scoreGatesGoogleReview }),
    completionRules,
  };
}

/**
 * Content-only live updates. Never copy unpublished question, routing, design,
 * identity, review eligibility, or URL settings into the published version.
 * Return only fields actually changed in the draft save.
 */
const LIVE_COPY_KEYS = [
  'title','heroLabel','heroTitle','heroSubtitle','description','introText',
  'anonymousText','completionText','googleReviewPromptText','submitLabel','buttonLabel',
] as const satisfies readonly (keyof SurveyConfig)[];

export function changedPublishedCopy(
  before: SurveyConfig,
  after: SurveyConfig,
): Partial<SurveyConfig> {
  const patch: Partial<SurveyConfig> = {};
  for (const key of LIVE_COPY_KEYS) {
    if (before[key] !== after[key]) {
      // These keys all hold strings (including optional text).
      (patch as Record<string,unknown>)[key] = after[key];
    }
  }
  return patch;
}
