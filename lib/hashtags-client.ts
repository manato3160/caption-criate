import type { HashtagResult } from './types';

/**
 * キャプションからハッシュタグを生成する（サーバーサイドAPI経由）
 * クライアント側から使用する関数
 */
export async function generateHashtags(caption: string): Promise<HashtagResult> {
  try {
    const response = await fetch('/api/hashtags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caption }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result as HashtagResult;
  } catch (error) {
    console.error('Hashtag API error:', error);
    throw error;
  }
}

