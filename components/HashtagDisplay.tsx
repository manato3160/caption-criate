'use client';

import { useState } from 'react';
import type { HashtagResult } from '@/lib/types';

interface HashtagDisplayProps {
  result: HashtagResult;
}

export default function HashtagDisplay({ result }: HashtagDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // ハッシュタグを#付きで結合
      const hashtagString = result.hashtags.map(tag => `#${tag}`).join(' ');
      await navigator.clipboard.writeText(hashtagString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };

  const hashtagString = result.hashtags.map(tag => `#${tag}`).join(' ');

  return (
    <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-twany-brown">
          推奨ハッシュタグ
        </h2>
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

      <div className="bg-twany-cream/30 rounded-lg p-6 border border-twany-pink/50">
        <div className="space-y-4">
          {/* 固定ワードの表示 */}
          {result.fixedHashtags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-twany-brown mb-2">
                固定ハッシュタグ ({result.fixedHashtags.length}個)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.fixedHashtags.map((tag, index) => (
                  <span
                    key={`fixed-${index}`}
                    className="inline-block px-3 py-1 bg-twany-pink/50 text-twany-brown rounded-full text-sm font-medium border border-twany-pink"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI選択ハッシュタグの表示 */}
          {result.selectedHashtags.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-twany-brown mb-2">
                AI選択ハッシュタグ ({result.selectedHashtags.length}個)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.selectedHashtags.map((tag, index) => (
                  <span
                    key={`selected-${index}`}
                    className="inline-block px-3 py-1 bg-white text-twany-brown rounded-full text-sm border border-twany-pink/50 hover:bg-twany-cream/50 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 全体のハッシュタグ文字列（コピー用） */}
          <div className="mt-4 pt-4 border-t border-twany-pink/30">
            <p className="text-xs text-twany-brown/70 mb-2">全ハッシュタグ:</p>
            <div className="bg-white rounded p-3 border border-twany-pink/30">
              <p className="text-sm text-twany-brown break-words font-mono">
                {hashtagString}
              </p>
            </div>
            <p className="text-xs text-twany-brown/70 mt-2">
              合計: {result.hashtags.length}個 / 文字数: {hashtagString.length}文字
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

