'use client';
import {useEffect, useState} from 'react';

// The survey editor's own section ids (components/admin/SurveyEditorWorkspace.tsx).
// Only ids from this known list are ever reported - never arbitrary DOM content.
const KNOWN_SECTION_IDS = ['basic-information', 'design-copy', 'questions', 'completion-settings', 'publish-settings'];

// Tracks which known section is currently most visible, via IntersectionObserver.
// `active` gates whether it observes at all, so pages/drawers that don't need it
// (assistant closed, or a page with none of these sections) pay no cost.
export function useActiveSection(active: boolean): string | undefined {
  const [activeSection, setActiveSection] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!active || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const elements = KNOWN_SECTION_IDS.map(id => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) visibility.set(entry.target.id, entry.intersectionRatio);
        let bestId: string | undefined;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        }
        if (bestId) setActiveSection(bestId);
      },
      {threshold: [0, 0.25, 0.5, 0.75, 1]},
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [active]);

  return activeSection;
}
