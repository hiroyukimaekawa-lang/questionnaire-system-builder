import type { SurveyConfig } from '@/types/database';

// Older versions stored the builder's choice only as anonymousText.
export function isAnonymousSurvey(config: SurveyConfig): boolean {
  return config.anonymous ?? /(?:この|こちらの)アンケートは匿名です/.test(config.anonymousText ?? '');
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
