import type { AnswerValue, GoogleReviewRule, RuleCondition, SurveyConfig, SurveyQuestion } from '@/types/database';
import { googleReviewMode, scoreMax } from '@/lib/survey';

function matchesCondition(
  condition: RuleCondition,
  answers: Record<string, AnswerValue>,
  ratingMaxByQuestionId: Map<string, 5 | 10>,
) {
  const max = ratingMaxByQuestionId.get(condition.questionId);
  if (!max || condition.value < 1 || condition.value > max) return false;

  const actual = Number(answers[condition.questionId]);
  if (!Number.isFinite(actual) || actual < 1 || actual > max) return false;

  if (condition.operator === 'gte') return actual >= condition.value;
  if (condition.operator === 'lte') return actual <= condition.value;
  return actual === condition.value;
}

function reviewRule(config: SurveyConfig): GoogleReviewRule | null {
  if (config.googleReviewRule?.conditions.length) return config.googleReviewRule;
  const legacy = (config as SurveyConfig & { googleReviewRules?: unknown }).googleReviewRules;
  if (!Array.isArray(legacy)) return null;
  const first = legacy.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    const rule = candidate as Partial<GoogleReviewRule>;
    return (rule.logic === 'and' || rule.logic === 'or') && Array.isArray(rule.conditions) && rule.conditions.length > 0;
  }) as GoogleReviewRule | undefined;
  return first ?? null;
}

export function evaluateGoogleReviewEligibility(
  config: SurveyConfig,
  questions: SurveyQuestion[],
  answers: Record<string, AnswerValue>,
) {
  const mode = googleReviewMode(config);
  if (mode === 'disabled' || !safeGoogleReviewUrl(config.googleReviewUrl)) return false;
  if (mode === 'all') return true;

  const rule = reviewRule(config);
  if (!rule?.conditions.length) return false;

  const ratingMaxByQuestionId = new Map(
    questions
      .filter((question) => question.type === 'rating_10')
      .map((question) => [question.id, scoreMax(question)] as const),
  );

  const test = (condition: RuleCondition) => matchesCondition(condition, answers, ratingMaxByQuestionId);
  return rule.logic === 'or' ? rule.conditions.some(test) : rule.conditions.every(test);
}

/** Only navigable web URLs are allowed, including for legacy stored config. */
export function safeGoogleReviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}
