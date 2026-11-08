'use client';

import { safeGoogleReviewUrl } from '@/lib/google-review';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { GoogleReviewMode } from '@/types/database';

const DEFAULT_REVIEW_PROMPT='よろしければ、Googleでもご感想をお聞かせください。';
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
  reviewPromptText,
  scoreGated = false,
  previewCompletion,
  onEditTarget,
}: {
  slug: string;
  text: string;
  reviewUrl: string | null;
  reviewMode: GoogleReviewMode;
  primaryColor: string;
  reviewPromptText?: string;
  scoreGated?: boolean;
  previewCompletion?: StoredCompletion;
  onEditTarget?: (target:string)=>void;
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
  const reviewPrompt=reviewPromptText===undefined?DEFAULT_REVIEW_PROMPT:reviewPromptText.trim();
  const completionCopy=stored.message || text;
  const showReview = Boolean(href) && reviewMode !== 'disabled' && (!scoreGated || stored.reviewEligible === true);

  async function copyComment() {
    if (!comment) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable');
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      setCopyFailed(false);

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

      {previewCompletion&&onEditTarget?<button type="button" className="preview-editable thanks-lead" onClick={()=>onEditTarget('completionText')}>{completionCopy}</button>:<p className="thanks-lead">{completionCopy}</p>}

      {comment && (
        <div className="thanks-comment-box">
          <strong className="thanks-comment-label">アンケートにご入力いただいた内容</strong>
          <p className="thanks-comment-text">{comment}</p>
        </div>
      )}

      {showReview && (
        <div className="thanks-review-block">
          {reviewPrompt&&(previewCompletion&&onEditTarget?<button type="button" className="preview-editable thanks-review-copy jp-copy" onClick={()=>onEditTarget('googleReviewPromptText')}>{reviewPrompt}</button>:<p className="thanks-review-copy jp-copy">{reviewPrompt}</p>)}
          <a className="btn thanks-review-button jp-ui-label" href={href!} target="_blank" rel="noopener noreferrer" onClick={e=>{if(previewCompletion){e.preventDefault();onEditTarget?.('googleReviewUrl');}}}>Google口コミを書く</a>
          {comment && <button type="button" className="btn secondary jp-ui-label" onClick={()=>void copyComment()}>感想をコピーする</button>}
          <p className="muted thanks-review-note">Google口コミは一般公開されます。公開したくない情報が含まれている場合は、貼り付け後に編集してから投稿してください。</p>
          {copyFailed && <p className="notice thanks-copy-notice" role="status">コピーできませんでした。上に表示された文章を長押ししてコピーできます。Google口コミへの移動は上のボタンから可能です。</p>}
          {copied && <p className="notice thanks-copy-notice" role="status">感想をコピーしました。</p>}
          {scoreGated&&<small className="muted thanks-review-note">評価分類の条件を満たした方に表示しています。</small>}
        </div>
      )}
    </section>
  );
}
