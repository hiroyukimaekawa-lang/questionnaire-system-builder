import type { IdentityMode, SurveyConfig } from '@/types/database';

// Older versions stored the builder's choice only as anonymousText.
export function isAnonymousSurvey(config: SurveyConfig): boolean {
  return config.anonymous ?? /(?:この|こちらの)アンケートは匿名です/.test(config.anonymousText ?? '');
}

const IDENTITY_MODES: IdentityMode[] = ['respondent_choice', 'anonymous_only', 'identified_only'];

// New configs set identityMode explicitly. Older configs (anonymous: true/false, or
// only anonymousText) are converted at read time without any bulk migration.
export function resolveIdentityMode(config: SurveyConfig): IdentityMode {
  if (config.identityMode && IDENTITY_MODES.includes(config.identityMode)) return config.identityMode;
  return isAnonymousSurvey(config) ? 'anonymous_only' : 'identified_only';
}

export function publicSurveyTitle(name: string, config: SurveyConfig): string {
  const title = (config.heroTitle || config.title || 'お客様アンケート').trim();
  const businessName = name.trim();
  // Separate legacy combined titles without changing the saved configuration.
  if (businessName && title.startsWith(businessName)) {
    return title.slice(businessName.length).trim() || 'お客様アンケート';
  }
  return title;
}
