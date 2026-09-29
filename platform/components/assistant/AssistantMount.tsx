'use client';
import dynamic from 'next/dynamic';
import type {AssistantEnvironment} from '@/lib/assistant/types';

// Lazy-loaded so the chat UI's JS is only fetched once this actually mounts. The
// server layout only renders <AssistantMount/> at all when the feature flag is on
// and the profile role is admin/sales (see app/admin/layout.tsx), so a disabled or
// viewer session never even references this chunk.
const AssistantRoot = dynamic(() => import('./AssistantRoot').then(m => m.AssistantRoot), {ssr: false});

export function AssistantMount({role, appCommitSha, environment}: {role: 'admin' | 'sales' | 'viewer'; appCommitSha?: string; environment: AssistantEnvironment}) {
  return <AssistantRoot role={role} appCommitSha={appCommitSha} environment={environment}/>;
}
