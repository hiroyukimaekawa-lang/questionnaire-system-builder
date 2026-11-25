import type {AnswerValue,SurveyQuestion} from '@/types/database';
import {sakuyamaReviewTemplate} from './sakuyama-review-templates';

/**
 * Survey-owned, zero-API-cost draft suggestions.
 * This does not infer specific experiences (e.g. a doctor's explanation)
 * from satisfaction scores. The patient must review and edit before copying.
 */
const scorePhrases: Record<number,string[]> = {
  1: ['満足できない点がありました。','改善してほしいと感じました。','期待とは異なる部分がありました。'],
  2: ['やや物足りなく感じました。','改善してほしい点が少しありました。','十分には満足できませんでした。'],
  3: ['おおむね普通だと感じました。','可もなく不可もないと感じました。','特に強い不満や満足はありませんでした。'],
  4: ['満足しています。','良かったと感じました。','全体的に好印象でした。'],
  5: ['とても満足しています。','非常に良かったと感じました。','大変満足できました。'],
};

function pick(phrases:string[],seed:number) {
  return phrases[Math.abs(seed)%phrases.length] ?? '';
}

function scoreSentence(subject:string,score:number,seed:number):string {
  return subject+'については、'+pick(scorePhrases[score]??[],seed);
}

function choiceLabel(question:SurveyQuestion,value:AnswerValue|undefined):string|null {
  if(typeof value!=='string')return null;
  return question.options.find(o=>o.value===value)?.label??null;
}

/** Uses only facts and overall opinions the respondent actually selected. */
export function generateSakuyamaAnswerDraft(
  questions:SurveyQuestion[],
  answers:Record<string,AnswerValue>,
):string {
  const ordered=[...questions].sort((a,b)=>a.sortOrder-b.sortOrder);
  const purpose=ordered.find(q=>q.sortOrder===0&&q.type==='single_choice');
  const medical=ordered.find(q=>q.sortOrder===1&&q.type==='rating_10');
  const staff=ordered.find(q=>q.sortOrder===2&&q.type==='rating_10');
  const source=ordered.find(q=>q.sortOrder===3&&q.type==='single_choice');
  const parts:string[]=[];
  const label=purpose?choiceLabel(purpose,answers[purpose.id]):null;
  const beginnings:Record<string,string>={
    '診察':'診察で受診しました。',
    '検査':'検査で受診しました。',
    '診察と検査':'診察と検査で受診しました。',
  };
  if(label&&beginnings[label])parts.push(beginnings[label]);
  const scores=[medical,staff].map(q=>q?Number(answers[q.id]):NaN);
  const selectedTemplate = label ? sakuyamaReviewTemplate(label,scores[0],scores[1]) : null;
  if (selectedTemplate) return selectedTemplate;
  const seed=scores.reduce((n,s)=>n+(Number.isInteger(s)?s:0),0)+(label?.length??0);
  if(Number.isInteger(scores[0])&&scores[0]>=1&&scores[0]<=5)parts.push(scoreSentence('診療内容',scores[0],seed));
  if(Number.isInteger(scores[1])&&scores[1]>=1&&scores[1]<=5)parts.push(scoreSentence('スタッフの対応',scores[1],seed+1));
  const sourceLabel=source?choiceLabel(source,answers[source.id]):null;
  const referrers=['ホームページ','Googleマップ','Medical DOC','東京ドクターズ','ご紹介'];
  if(sourceLabel&&referrers.includes(sourceLabel))parts.push(sourceLabel==='ご紹介'?'紹介をきっかけに知りました。':sourceLabel+'をきっかけに知りました。');
  return parts.join('\n');
}
