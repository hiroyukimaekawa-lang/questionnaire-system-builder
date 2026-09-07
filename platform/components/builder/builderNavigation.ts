import type {BuilderContext,BuilderStep} from '@/types/database';
import {reopenBuilderStep} from './builderPreview';

export type BuilderHistoryEntry={step:BuilderStep;value:unknown;label:string};
export const summaryEditStepId='completionText';

// Both the previous-step button and an arbitrary history edit use this transition.
export function editBuilderHistory(context:BuilderContext,history:BuilderHistoryEntry[],index=history.length-1){
  if(!Number.isInteger(index)||index<0||index>=history.length)return null;
  return {context:reopenBuilderStep(context,history[index].step.id),history:history.slice(0,index)};
}
