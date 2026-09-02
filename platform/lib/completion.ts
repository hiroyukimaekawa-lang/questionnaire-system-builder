import type { AnswerValue, CompletionRule, SurveyConfig } from '@/types/database';

export interface CompletionResult { completionMessage: string; needsFollowUp: boolean; matchedRuleId: string | null }

function matchesCondition(condition: CompletionRule['conditions'][number], answers: Record<string, AnswerValue>) {
  const actual = Number(answers[condition.questionId]);
  if (!Number.isFinite(actual)) return false;
  if (condition.operator === 'gte') return actual >= condition.value;
  if (condition.operator === 'lte') return actual <= condition.value;
  return actual === condition.value;
}

export function evaluateCompletionRules(config: SurveyConfig, answers: Record<string, AnswerValue>): CompletionResult {
  for (const rule of config.completionRules ?? []) {
    if (!rule.conditions.length) continue;
    const matched = rule.logic === 'or'
      ? rule.conditions.some(condition => matchesCondition(condition, answers))
      : rule.conditions.every(condition => matchesCondition(condition, answers));
    if (matched) return { completionMessage: rule.completionMessage?.trim() || config.completionText, needsFollowUp: Boolean(rule.needsFollowUp), matchedRuleId: rule.id };
  }
  return { completionMessage: config.completionText, needsFollowUp: false, matchedRuleId: null };
}
