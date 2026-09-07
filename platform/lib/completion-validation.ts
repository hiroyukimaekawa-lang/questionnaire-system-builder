import { z } from 'zod';
import type { GoogleReviewRule, SurveyQuestion } from '@/types/database';
import { scoreMax } from '@/lib/survey';

const conditionSchema = z.object({
  questionId: z.string().uuid(),
  operator: z.enum(['gte', 'lte', 'eq']),
  value: z.number().int().finite().min(1).max(10),
}).strict();

export const completionRulesSchema = z.array(z.object({
  id: z.string().trim().min(1).max(100),
  logic: z.enum(['and', 'or']),
  conditions: z.array(conditionSchema).min(1).max(10),
  completionMessage: z.string().max(1000).optional(),
  needsFollowUp: z.boolean().optional().default(false),
}).strict()).max(20);

export const googleReviewRuleSchema = z.object({
  logic: z.enum(['and', 'or']),
  conditions: z.array(conditionSchema).min(1).max(10),
}).strict();

function parseJson(raw: string, maxBytes: number, message: string) {
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error(`${message}が大きすぎます。`);
  try { return JSON.parse(raw) as unknown; } catch { throw new Error(`${message}のJSONが不正です。`); }
}

export function parseCompletionRulesJson(raw: string, maxBytes = 50_000) {
  const parsed = parseJson(raw, maxBytes, '完了条件');
  const result = completionRulesSchema.safeParse(parsed);
  if (!result.success) throw new Error('完了条件が不正です。');
  return result.data;
}

export function parseGoogleReviewRuleJson(raw: string, maxBytes = 20_000): GoogleReviewRule {
  const parsed = parseJson(raw, maxBytes, 'Google口コミ表示条件');
  const result = googleReviewRuleSchema.safeParse(parsed);
  if (!result.success) throw new Error('Google口コミ表示条件が不正です。');
  return result.data;
}

function validateConditionsForQuestions(conditions: Array<{ questionId: string; value: number }>, questions: SurveyQuestion[]) {
  const ratings = new Map(questions.filter(q => q.type === 'rating_10').map(q => [q.id, scoreMax(q)]));
  for (const condition of conditions) {
    const max = ratings.get(condition.questionId);
    if (!max) return '現在の下書きに存在する評価質問を選択してください。';
    if (condition.value > max) return `条件値は1〜${max}で入力してください。`;
  }
  return null;
}

export function validateRulesForQuestions(rules: z.infer<typeof completionRulesSchema>, questions: SurveyQuestion[]) {
  for (const rule of rules) {
    const error = validateConditionsForQuestions(rule.conditions, questions);
    if (error) return error;
  }
  return null;
}

export function validateGoogleReviewRuleForQuestions(rule: GoogleReviewRule, questions: SurveyQuestion[]) {
  return validateConditionsForQuestions(rule.conditions, questions);
}
