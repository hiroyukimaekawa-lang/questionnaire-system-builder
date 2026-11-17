import type {SurveyQuestion} from '@/types/database';

/**
 * Text-only updates are safe only if the entire saved draft has the same
 * question structure and order as the public version. Question UUIDs differ
 * between published and draft versions, so compare by position rather than ID.
 */
export function publishedQuestionCopyUpdates(
  published: SurveyQuestion[],
  savedDraft: SurveyQuestion[],
): Array<{id:string;title:string;description:string}> | null {
  if (published.length !== savedDraft.length || !published.length) return null;
  const updates: Array<{id:string;title:string;description:string}> = [];
  for (let i=0;i<published.length;i++) {
    const live=published[i],draft=savedDraft[i];
    if (live.type!==draft.type || live.required!==draft.required
      || JSON.stringify(live.settings??{})!==JSON.stringify(draft.settings??{})
      || live.options.length!==draft.options.length) return null;
    for (let j=0;j<live.options.length;j++) {
      const a=live.options[j],b=draft.options[j];
      if (a.label!==b.label || a.value!==b.value) return null;
    }
    if (live.title!==draft.title || live.description!==draft.description) {
      updates.push({id:live.id,title:draft.title,description:draft.description});
    }
  }
  return updates;
}
