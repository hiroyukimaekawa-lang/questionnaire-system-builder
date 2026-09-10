'use client';

import { safeGoogleReviewUrl } from '@/lib/google-review';
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
  previewCompletion,
}: {
  slug: string;
  text: string;
  reviewUrl: string | null;
  reviewMode: GoogleReviewMode;
  primaryColor: string;
  previewCompletion?: StoredCompletion;
}) {
  const [saved] = useState<StoredCompletion>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(sessionStorage.getItem(`survey-completion:${slug}`) || '{}');
    } catch {
      return {};
    }
  });
  const stored=previewCompletion??saved;
  const [copied, setCopied] = useState(false);
  const comment = stored.comment ?? '';
  const href = safeGoogleReviewUrl(reviewUrl);
  const [copyFailed, setCopyFailed] = useState(false);
  const showReview = Boolean(href) && (
    reviewMode === 'all' || (reviewMode === 'score' && stored.reviewEligible === true)
  );

  async function review(goToGoogle=false) {
    if (!comment) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable');
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      setCopyFailed(false);
      if(goToGoogle && href && !previewCompletion){window.alert('感想をコピーしました。Google口コミ画面で貼り付けてご利用ください。');window.location.assign(href);}
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
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
          <strong className="thanks-comment-label">アンケートにご入力いただいた内容</strong>
          <p className="thanks-comment-text">{comment}</p>
        </div>
      )}

      {showReview && (
        <div className="thanks-review-block">
          <p className="thanks-review-copy jp-copy">
            <span className="jp-keep">よろしければ、</span>
            Googleでもご感想をお聞かせください。
          </p>
          {comment ? <button type="button" className="btn thanks-review-button jp-ui-label" onClick={()=>void review(true)}>感想をコピーしてGoogle口コミへ</button> : <a className="btn thanks-review-button jp-ui-label" href={href!} target="_blank" rel="noopener noreferrer" onClick={e=>{if(previewCompletion)e.preventDefault()}}>Google口コミを書く</a>}
          {copyFailed&&<div className="stack"><button type="button" className="btn secondary" onClick={()=>void review()}>文章をコピーする</button><a className="btn secondary" href={href!} target="_blank" rel="noopener noreferrer" onClick={e=>{if(previewCompletion)e.preventDefault()}}>Google口コミへ進む</a></div>}
          <p className="muted thanks-review-note">Google口コミは一般公開されます。公開したくない情報が含まれている場合は、貼り付け後に編集してから投稿してください。</p>
          {copyFailed && <p className="notice thanks-copy-notice" role="status">自動コピーできませんでした。上に表示された文章を長押ししてコピーしてからお進みください。</p>}
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
