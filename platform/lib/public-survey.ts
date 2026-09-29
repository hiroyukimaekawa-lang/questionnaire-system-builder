import type { IdentityMode, SurveyConfig } from '@/types/database';

// Older versions stored the builder's choice only as anonymousText.
export function isAnonymousSurvey(config: SurveyConfig): boolean {
  return config.anonymous ?? /(?:この|こちらの)アンケートは匿名です/.test(config.anonymousText ?? '');
}

const IDENTITY_MODES: IdentityMode[] = ['respondent_choice', 'anonymous_only', 'identified_only'];

// Versions saved before the 3-mode identity setting existed have no identityMode at
// all. They must keep behaving exactly as before (no name prompt, no anonymous/
// identified choice) rather than being guessed into identified_only.
export type ResolvedIdentityMode = IdentityMode | 'legacy';

// New configs set identityMode explicitly. Older configs without it stay on their
// pre-3-mode behavior: explicit anonymous:true keeps showing the anonymous note
// (anonymous_only), anything else (anonymous:false or unset) is 'legacy' and gets
// none of the new identity UI or validation.
export function resolveIdentityMode(config: SurveyConfig): ResolvedIdentityMode {
  if (config.identityMode && IDENTITY_MODES.includes(config.identityMode)) return config.identityMode;
  if (config.anonymous === true) return 'anonymous_only';
  return 'legacy';
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
