import type { AnswerValue, RuleCondition, SurveyConfig, SurveyQuestion } from '@/types/database';
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

export function evaluateGoogleReviewEligibility(
  config: SurveyConfig,
  questions: SurveyQuestion[],
  answers: Record<string, AnswerValue>,
) {
  const mode = googleReviewMode(config);
  if (mode === 'disabled' || !config.googleReviewUrl) return false;
  if (mode === 'all') return true;

  const rule = config.googleReviewRule;
  if (!rule?.conditions.length) return false;

  const ratingMaxByQuestionId = new Map(
    questions
      .filter((question) => question.type === 'rating_10')
      .map((question) => [question.id, scoreMax(question)] as const),
  );

  const test = (condition: RuleCondition) => matchesCondition(condition, answers, ratingMaxByQuestionId);
  return rule.logic === 'or' ? rule.conditions.some(test) : rule.conditions.every(test);
}
