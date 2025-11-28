'use client';

import { useState } from 'react';
import type { ReviewResult } from '@/lib/types';

interface CaptionDisplayProps {
  caption: string;
  onEdit?: () => void;
  onManualEdit?: () => void;
  onNew?: () => void;
  reviewResult?: ReviewResult;
}

export default function CaptionDisplay({ caption, onEdit, onManualEdit, onNew, reviewResult }: CaptionDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  if (!caption) {
    return null;
  }

  /**
   * NG表現をハイライトしたReactコンポーネントを生成
   */
  const renderHighlightedText = () => {
    if (!reviewResult || reviewResult.passed) {
      return null;
    }

    // 位置でソートされたissuesを使用
    const issues = [...reviewResult.issues].sort((a, b) => a.position.start - b.position.start);
    
    // 重複を除去（同じ位置のものは1つだけ）
    const uniqueIssues: typeof issues = [];
    const seenPositions = new Set<string>();
    
    for (const issue of issues) {
      const key = `${issue.position.start}-${issue.position.end}`;
      if (!seenPositions.has(key)) {
        seenPositions.add(key);
        uniqueIssues.push(issue);
      }
    }

    // テキストを分割してハイライト部分を生成の配列を作成
    const parts: Array<{ text: string; isHighlighted: boolean; reason?: string }> = [];
    let lastIndex = caption.length;

    // 後ろから前に処理することで、インデックスがずれないようにする
    const sortedIssues = [...uniqueIssues].sort((a, b) => b.position.start - a.position.start);
    
    for (const issue of sortedIssues) {
      // ハイライト後の部分を追加
      if (issue.position.end < lastIndex) {
        parts.unshift({
          text: caption.substring(issue.position.end, lastIndex),
          isHighlighted: false,
        });
      }
      
      // ハイライト部分を追加
      parts.unshift({
        text: caption.substring(issue.position.start, issue.position.end),
        isHighlighted: true,
        reason: issue.reason,
      });
      
      lastIndex = issue.position.start;
    }
    
    // 最初の部分を追加
    if (lastIndex > 0) {
      parts.unshift({
        text: caption.substring(0, lastIndex),
        isHighlighted: false,
      });
    }
    
    // ハイライトがない場合は全体を追加
    if (parts.length === 0) {
      parts.push({
        text: caption,
        isHighlighted: false,
      });
    }

    // Reactコンポーネントの配列を返す
    return parts.map((part, idx) => {
      if (part.isHighlighted) {
        return (
          <mark
            key={idx}
            className="bg-red-200 text-red-900 font-semibold px-1 rounded"
            title={part.reason}
          >
            {part.text}
          </mark>
        );
      }
      return <span key={idx}>{part.text}</span>;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-twany-brown">
          生成されたキャプション
        </h2>
        <div className="flex items-center space-x-2">
          {onNew && (
            <button
              onClick={onNew}
              className="px-4 py-2 text-sm font-medium text-twany-brown border border-twany-pink rounded-lg hover:bg-twany-cream transition-colors"
            >
              新規作成
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-twany-rose border border-twany-rose rounded-lg hover:bg-twany-cream transition-colors"
            >
              修正する
            </button>
          )}
          {onManualEdit && (
            <button
              onClick={onManualEdit}
              className="px-4 py-2 text-sm font-medium text-twany-brown border border-twany-pink rounded-lg hover:bg-twany-cream transition-colors"
            >
              手動修正
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2
              ${
                copied
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-twany-rose text-white hover:bg-twany-rose/90'
              }
            `}
          >
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>コピーしました</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>コピー</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-twany-cream/30 rounded-lg p-6 border border-twany-pink/50">
        <div className="prose prose-sm max-w-none">
          {reviewResult && !reviewResult.passed ? (
            <div className="whitespace-pre-wrap font-sans text-twany-brown leading-relaxed">
              {renderHighlightedText() || caption}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-twany-brown leading-relaxed">
              {caption}
            </pre>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-twany-brown/70">
        <p>文字数: {caption.length}文字</p>
      </div>
    </div>
  );
}

