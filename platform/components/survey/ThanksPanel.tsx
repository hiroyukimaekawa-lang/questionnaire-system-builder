'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

type StoredCompletion = {
  responseId?: string;
  message?: string;
  comment?: string;
};

type ThanksPanelStyle = CSSProperties & {
  '--thanks-brand': string;
};

export function ThanksPanel({
  slug,
  text,
  reviewUrl,
  primaryColor,
}: {
  slug: string;
  text: string;
  reviewUrl: string | null;
  primaryColor: string;
}) {
  const [stored] = useState<StoredCompletion>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(sessionStorage.getItem(`survey-completion:${slug}`) || '{}');
    } catch {
      return {};
    }
  });
  const [copied, setCopied] = useState(false);
  const comment = stored.comment ?? '';

  async function review() {
    if (comment) {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
    }
    if (reviewUrl) window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  }

  const style = { '--thanks-brand': primaryColor } as ThanksPanelStyle;

  return (
    <section className="card thanks-panel jp-copy" style={style}>
      <div className="thanks-success-mark" aria-hidden="true">✓</div>
      <p className="thanks-eyebrow">THANK YOU</p>

      <h1 className="thanks-title jp-heading">
        <span className="thanks-title-phrase">ご回答</span>
        <span className="thanks-title-phrase">ありがとうございました。</span>
      </h1>

      <p className="thanks-lead">{stored.message || text}</p>

      {comment && (
        <div className="thanks-comment-box">
          <strong className="thanks-comment-label">ご入力いただいたご感想</strong>
          <p className="thanks-comment-text">{comment}</p>
        </div>
      )}

      {reviewUrl && (
        <div className="thanks-review-block">
          <p className="thanks-review-copy jp-copy">
            <span className="jp-keep">よろしければ、</span>
            Googleでもご感想をお聞かせください。
          </p>
          <button className="btn thanks-review-button jp-ui-label" onClick={review} type="button">
            {comment ? '感想をコピーしてGoogleクチコミへ' : 'Googleクチコミを書く'}
          </button>
          {copied && <p className="notice thanks-copy-notice" role="status">感想をコピーしました。</p>}
          <small className="muted thanks-review-note">
            この案内は回答内容や点数にかかわらず、すべての回答者に同じ条件で表示されます。
          </small>
        </div>
      )}
    </section>
  );
}
