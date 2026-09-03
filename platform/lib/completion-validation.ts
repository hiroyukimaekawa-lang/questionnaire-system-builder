import { z } from 'zod';
import type { SurveyQuestion } from '@/types/database';
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

export function parseCompletionRulesJson(raw: string, maxBytes = 50_000) {
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error('完了条件が大きすぎます。');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('完了条件のJSONが不正です。'); }
  const result = completionRulesSchema.safeParse(parsed);
  if (!result.success) throw new Error('完了条件が不正です。');
  return result.data;
}

export function validateRulesForQuestions(rules: z.infer<typeof completionRulesSchema>, questions: SurveyQuestion[]) {
  const ratings = new Map(questions.filter(q => q.type === 'rating_10').map(q => [q.id, scoreMax(q)]));
  for (const rule of rules) for (const condition of rule.conditions) {
    const max = ratings.get(condition.questionId);
    if (!max) return '現在の下書きに存在する評価質問を選択してください。';
    if (condition.value > max) return `条件値は1〜${max}で入力してください。`;
  }
  return null;
}
