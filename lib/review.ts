import type { ReviewResult } from './types';

/**
 * キャプション本文をAIで薬機審査する（サーバーサイドAPI経由）
 */
export async function reviewCaption(caption: string): Promise<ReviewResult> {
  try {
    const response = await fetch('/api/review', {
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
    return result as ReviewResult;
  } catch (error) {
    console.error('Review API error:', error);
    throw error;
  }
}


