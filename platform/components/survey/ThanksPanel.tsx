'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { GoogleReviewMode } from '@/types/database';

type StoredCompletion = {
  responseId?: string;
  message?: string;
  comment?: string;
  reviewEligible?: boolean;
};

type ThanksPanelStyle = CSSProperties & {
  '--thanks-brand': string;
};

export function ThanksPanel({
  slug,
  text,
  reviewUrl,
  reviewMode,
  primaryColor,
}: {
  slug: string;
  text: string;
  reviewUrl: string | null;
  reviewMode: GoogleReviewMode;
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
  const showReview = Boolean(reviewUrl) && (
    reviewMode === 'all' || (reviewMode === 'score' && stored.reviewEligible === true)
  );

  async function review() {
    if (comment) {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
    }
    if (showReview && reviewUrl) window.open(reviewUrl, '_blank', 'noopener,noreferrer');
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

      {showReview && (
        <div className="thanks-review-block">
          <p className="thanks-review-copy jp-copy">
            <span className="jp-keep">よろしければ、</span>
            Googleでもご感想をお聞かせください。
          </p>
          <button className="btn thanks-review-button jp-ui-label" onClick={review} type="button">
            {comment ? '感想をコピーしてGoogleクチコミへ' : 'Googleクチコミを書く'}
          </button>
          {copied && <p className="notice thanks-copy-notice" role="status">感想をコピーしました。</p>}
          {reviewMode === 'all' && (
            <small className="muted thanks-review-note">
              この案内はすべての回答者に同じ条件で表示されます。
            </small>
          )}
        </div>
      )}
    </section>
  );
}
