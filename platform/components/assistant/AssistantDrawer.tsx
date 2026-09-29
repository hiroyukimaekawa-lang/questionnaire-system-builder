'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {AssistantMessage, ImprovementProposalDraft, QuestionnaireAssistantContext} from '@/lib/assistant/types';

const MAX_HISTORY = 20;
const SUGGESTED_PROMPTS = ['この画面の使い方を教えて', 'Google口コミ設定について教えて', 'アンケートの公開方法を教えて', 'ここが使いづらい'];
const INITIAL_MESSAGE = 'こんにちは。\nアンケートシステムの操作方法や、使いづらいところについて質問できます。\n\n現在開いている画面も把握しているので、\n『これどう使う?』\n『ここが使いづらい』\nだけでも大丈夫です。';

// Keyed by a server-computed per-user key (see lib/assistant/storage-key.ts) rather
// than a fixed constant - sessionStorage is scoped to the tab/origin, not to who's
// logged in, so a fixed key would let a second employee who logs into the same tab
// read the first employee's conversation.
function loadHistory(key: string): AssistantMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(key: string, history: AssistantMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // sessionStorage unavailable (private mode etc.) - conversation just won't persist.
  }
}

interface ChatResponse {
  message: string;
  readyForConfirmation: boolean;
  proposal?: ImprovementProposalDraft;
}

export function AssistantDrawer({context, onClose, titleId, drawerId, historyStorageKey}: {context: QuestionnaireAssistantContext; onClose: () => void; titleId: string; drawerId: string; historyStorageKey: string}) {
  const [history, setHistory] = useState<AssistantMessage[]>(() => loadHistory(historyStorageKey));
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ImprovementProposalDraft | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState('');
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => { composerRef.current?.focus(); }, []);
  useEffect(() => { saveHistory(historyStorageKey, history); }, [historyStorageKey, history]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setError(false);
    setLastFailedMessage(null);
    setSubmittedNotice('');
    const nextHistory: AssistantMessage[] = [...history, {role: 'user', content: trimmed}];
    setHistory(nextHistory);
    setInput('');
    setPending(true);
    try {
      const response = await fetch('/api/internal-assistant/chat', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({message: trimmed, history: history.slice(-MAX_HISTORY), context}),
      });
      if (!response.ok) throw new Error('request-failed');
      const data = await response.json() as ChatResponse;
      setHistory(current => [...current, {role: 'assistant', content: data.message}]);
      setPendingProposal(data.readyForConfirmation && data.proposal ? data.proposal : null);
    } catch {
      setError(true);
      setLastFailedMessage(trimmed);
      setHistory(current => current.slice(0, -1));
    } finally {
      setPending(false);
    }
  };

  const retry = () => { if (lastFailedMessage) void send(lastFailedMessage); };

  const submitProposal = async () => {
    if (!pendingProposal || submittingProposal) return;
    setSubmittingProposal(true);
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/internal-assistant/improvements', {
        method: 'POST',
        headers: {'content-type': 'application/json', 'x-idempotency-key': idempotencyKeyRef.current},
        body: JSON.stringify({proposal: pendingProposal, context}),
      });
      if (!response.ok) throw new Error('submit-failed');
      setSubmittedNotice('改善要望として送信しました。ご協力ありがとうございます。');
      setPendingProposal(null);
      idempotencyKeyRef.current = '';
    } catch {
      setSubmittedNotice('送信できませんでした。もう一度お試しください。');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const declineProposal = () => { setPendingProposal(null); idempotencyKeyRef.current = ''; };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  };

  const showSuggestions = history.length === 0;
  const messages = useMemo(() => history, [history]);

  return (
    <div className="assistant-overlay" onClick={onClose}>
      <div className="assistant-drawer" id={drawerId} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={drawerRef} onClick={event => event.stopPropagation()}>
        <header className="assistant-header">
          <div>
            <h2 id={titleId}>アンケートAI</h2>
            <p className="muted">操作方法や改善点について質問できます</p>
          </div>
          <button type="button" className="assistant-close" onClick={onClose} aria-label="閉じる">×</button>
        </header>

        <div className="assistant-messages" role="log" aria-live="polite">
          <div className="assistant-bubble assistant-bubble-assistant">{INITIAL_MESSAGE.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</div>
          {messages.map((message, index) => (
            <div key={index} className={`assistant-bubble assistant-bubble-${message.role}`}>{message.content}</div>
          ))}
          {pending && <div className="assistant-bubble assistant-bubble-assistant assistant-pending" role="status">入力中…</div>}
          {error && (
            <div className="assistant-bubble assistant-bubble-error" role="alert">
              回答を取得できませんでした。
              <button type="button" className="btn secondary assistant-retry" onClick={retry}>再送</button>
            </div>
          )}
          {pendingProposal && (
            <div className="assistant-proposal-actions">
              <button type="button" className="btn" disabled={submittingProposal} onClick={submitProposal}>{submittingProposal ? '送信中…' : '改善要望として送る'}</button>
              <button type="button" className="btn secondary" disabled={submittingProposal} onClick={declineProposal}>今回は送らない</button>
            </div>
          )}
          {submittedNotice && <p className="notice" role="status">{submittedNotice}</p>}
        </div>

        {showSuggestions && (
          <div className="assistant-suggestions">
            {SUGGESTED_PROMPTS.map(prompt => (
              <button type="button" className="btn secondary assistant-suggestion" key={prompt} onClick={() => void send(prompt)}>{prompt}</button>
            ))}
          </div>
        )}

        <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void send(input); }}>
          <textarea
            ref={composerRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="質問や気になることを入力してください"
            aria-label="メッセージを入力"
            rows={2}
          />
          <button type="submit" className="btn" disabled={pending || !input.trim()}>送信</button>
        </form>
      </div>
    </div>
  );
}
