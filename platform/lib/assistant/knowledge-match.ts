import {KNOWLEDGE_BASE, type KnowledgeEntry} from './knowledge';
import type {AssistantPageType} from './types';

// Plain scored lookup, not an LLM call: count matched keywords, give a small boost
// when the entry is scoped to the current page. No match -> null, and the caller
// must say "確認できません" rather than inventing an answer (see fallback-provider).
export function findKnowledgeMatch(message: string, pageType?: AssistantPageType): KnowledgeEntry | null {
  const text = message.toLowerCase();
  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword.toLowerCase())) score += 1;
    }
    if (score === 0) continue;
    if (pageType && entry.pageTypes?.includes(pageType)) score += 0.5;
    if (!best || score > best.score) best = { entry, score };
  }
  return best?.entry ?? null;
}
