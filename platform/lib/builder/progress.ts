export const builderPhases=[
  {number:1,label:'目的',steps:['purpose','purposeDetail']},
  {number:2,label:'店舗情報',steps:['storeName','businessType']},
  {number:3,label:'作成方法',steps:['startingPoint','template']},
  {number:4,label:'質問',steps:['questions','questionsConfirmed']},
  {number:5,label:'デザイン',steps:['anonymous','heroTitle','introText','mainColor','logoMode','logoUrl']},
  {number:6,label:'口コミ',steps:['googleReviewEnabled','googleReviewUrl']},
  {number:7,label:'完了',steps:['completionText','summary']},
] as const;

export function builderPhaseForStep(stepId:string|undefined){return builderPhases.find(phase=>(phase.steps as readonly string[]).includes(stepId??''))?.number??1}
