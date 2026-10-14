import type { AnswerValue, CompletionRule, SurveyConfig, SurveyQuestion } from '@/types/database';
import {scoreMax} from '@/lib/survey';

export interface CompletionResult { completionMessage: string; needsFollowUp: boolean; matchedRuleId: string | null }

function matchesCondition(condition: CompletionRule['conditions'][number], answers: Record<string, AnswerValue>) {
  const actual = Number(answers[condition.questionId]);
  if (!Number.isFinite(actual)) return false;
  if (condition.operator === 'gte') return actual >= condition.value;
  if (condition.operator === 'lte') return actual <= condition.value;
  return actual === condition.value;
}

function matchesAggregate(rule:CompletionRule,answers:Record<string,AnswerValue>,questions:SurveyQuestion[]) {
  if(rule.conditionType!=='aggregate'||!rule.aggregate||rule.aggregate.operator!=='gte')return false;
  const ratings=new Map(questions.filter(q=>q.type==='rating_10').map(q=>[q.id,scoreMax(q)]));
  let total=0;
  for(const id of rule.aggregate.questionIds){
    const max=ratings.get(id),actual=answers[id];
    if(!max||typeof actual!=='number'||!Number.isInteger(actual)||actual<1||actual>max)return false;
    total+=actual;
  }
  return total>=rule.aggregate.value;
}

export function evaluateCompletionRules(config: SurveyConfig, answers: Record<string, AnswerValue>, questions:SurveyQuestion[]=[]): CompletionResult {
  for (const rule of config.completionRules ?? []) {
    if (rule.conditionType!=='aggregate'&&!rule.conditions.length) continue;
    const matched = rule.conditionType==='aggregate'?matchesAggregate(rule,answers,questions):rule.logic === 'or'
      ? rule.conditions.some(condition => matchesCondition(condition, answers))
      : rule.conditions.every(condition => matchesCondition(condition, answers));
    if (matched) return { completionMessage: rule.completionMessage?.trim() || config.completionText, needsFollowUp: Boolean(rule.needsFollowUp), matchedRuleId: rule.id };
  }
  return { completionMessage: config.completionText, needsFollowUp: false, matchedRuleId: null };
}
