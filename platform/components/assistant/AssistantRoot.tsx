'use client';
import {useId, useState} from 'react';
import {usePathname} from 'next/navigation';
import {AssistantDrawer} from './AssistantDrawer';
import {useActiveSection} from './useActiveSection';
import {inferPageType, inferSurveyId} from '@/lib/assistant/context';
import type {AssistantEnvironment, QuestionnaireAssistantContext} from '@/lib/assistant/types';

// Server-checked twice already (feature flag + role) before this even mounts - see
// app/admin/layout.tsx - but role is re-checked here too so this component is safe
// to reuse regardless of how it's wired in.
export function AssistantRoot({role, appCommitSha, environment, historyStorageKey}: {role: 'admin' | 'sales' | 'viewer'; appCommitSha?: string; environment: AssistantEnvironment; historyStorageKey: string}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeSection = useActiveSection(open);
  const titleId = useId();
  const drawerId = useId();

  if (role !== 'admin' && role !== 'sales') return null;

  // draftVersionId is deliberately not set here - the survey editor has no
  // dependency on the assistant to publish it, and a client-supplied value would
  // be untrustworthy anyway. Both API routes resolve it themselves from surveyId.
  const context: QuestionnaireAssistantContext = {
    system: 'questionnaire',
    pagePath: pathname,
    pageType: inferPageType(pathname),
    surveyId: inferSurveyId(pathname),
    userRole: role,
    activeSection,
    environment,
    appCommitSha,
  };

  return (
    <>
      <button type="button" className="assistant-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls={drawerId}>
        AIに質問
      </button>
      {open && <AssistantDrawer context={context} onClose={() => setOpen(false)} titleId={titleId} drawerId={drawerId} historyStorageKey={historyStorageKey}/>}
    </>
  );
}
