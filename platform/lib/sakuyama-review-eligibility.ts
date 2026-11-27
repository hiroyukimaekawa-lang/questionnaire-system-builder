import type {AnswerValue,SurveyQuestion} from '@/types/database';

/** Sakuyama-only: both five-point satisfaction answers must total at least eight. */
export function isSakuyamaReviewEligible(
  questions:SurveyQuestion[],
  answers:Record<string,AnswerValue>,
):boolean {
  const ordered=[...questions].sort((a,b)=>a.sortOrder-b.sortOrder);
  const medical=ordered.find(q=>q.sortOrder===1&&q.type==='rating_10');
  const staff=ordered.find(q=>q.sortOrder===2&&q.type==='rating_10');
  if(!medical||!staff)return false;
  const scores=[answers[medical.id],answers[staff.id]].map(value=>typeof value==='number'?value:NaN);
  return scores.every(score=>Number.isInteger(score)&&score>=1&&score<=5)
    && scores[0]+scores[1]>=8;
}
