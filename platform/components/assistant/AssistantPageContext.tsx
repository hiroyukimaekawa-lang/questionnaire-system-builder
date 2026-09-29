'use client';
import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';

// draftVersionId isn't in the URL (the editor fetches it server-side), so pages that
// know it publish it here; everything else (surveyId, pageType) is derived from the
// route alone in lib/assistant/context.ts. Nothing routed through this context may
// carry respondent answers or PII - it exists only to complete
// QuestionnaireAssistantContext.
interface AssistantPageState {
  draftVersionId?: string;
}

interface AssistantPageContextValue extends AssistantPageState {
  setDraftVersionId: (id: string | undefined) => void;
}

const AssistantPageContext = createContext<AssistantPageContextValue>({
  draftVersionId: undefined,
  setDraftVersionId: () => {},
});

export function AssistantPageProvider({children}: {children: ReactNode}) {
  const [draftVersionId, setDraftVersionId] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({draftVersionId, setDraftVersionId}), [draftVersionId]);
  return <AssistantPageContext.Provider value={value}>{children}</AssistantPageContext.Provider>;
}

export function useAssistantPageState(): AssistantPageState {
  const {draftVersionId} = useContext(AssistantPageContext);
  return {draftVersionId};
}

// A page/component that knows the current draft's id (e.g. the survey editor) calls
// this setter, typically from a useEffect keyed on the id. See
// SurveyEditorWorkspace.tsx for the one current caller.
export function useSetAssistantDraftVersionId(): (id: string | undefined) => void {
  return useContext(AssistantPageContext).setDraftVersionId;
}
