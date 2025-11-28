'use client';

import type { ReviewResult } from '@/lib/types';

interface ReviewResultProps {
  result: ReviewResult;
  caption: string;
}

export default function ReviewResultDisplay({ result, caption }: ReviewResultProps) {
  if (result.passed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800 font-medium">薬機審査を通過しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-800 font-medium">
            {result.totalIssues}件のNG表現が検出されました
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {result.issues.map((issue, index) => {
          // 該当箇所の前後のテキストを取得（コンテキスト表示用）
          const contextStart = Math.max(0, issue.position.start - 20);
          const contextEnd = Math.min(caption.length, issue.position.end + 20);
          const context = caption.substring(contextStart, contextEnd);
          const highlightStart = issue.position.start - contextStart;
          const highlightEnd = issue.position.end - contextStart;

          return (
            <div
              key={`${issue.knowledgeId}-${index}`}
              className="bg-white border border-red-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">
                    {index + 1}. {issue.name}
                  </p>
                  <p className="text-sm text-red-700 mb-2">{issue.reason}</p>
                  
                  {/* 該当箇所の表示 */}
                  <div className="bg-gray-50 rounded p-2 text-sm">
                    <p className="text-gray-600 mb-1">該当箇所:</p>
                    <p className="font-mono">
                      {context.substring(0, highlightStart)}
                      <span className="bg-red-200 font-bold text-red-900">
                        {context.substring(highlightStart, highlightEnd)}
                      </span>
                      {context.substring(highlightEnd)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>注意:</strong> 検出されたNG表現は薬機法に抵触する可能性があります。
          キャプションを修正することをお勧めします。
        </p>
      </div>
    </div>
  );
}


