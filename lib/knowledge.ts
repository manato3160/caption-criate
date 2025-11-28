import type { KnowledgeItem } from './types';
import knowledgeData from '@/data/knowledge.json';

let knowledgeCache: KnowledgeItem[] | null = null;

/**
 * ナレッジベースを読み込む
 */
export function loadKnowledge(): KnowledgeItem[] {
  if (knowledgeCache) {
    return knowledgeCache;
  }
  
  knowledgeCache = knowledgeData as KnowledgeItem[];
  return knowledgeCache;
}

/**
 * 特定の表現でナレッジアイテムを検索
 */
export function findKnowledgeByExpression(expression: string): KnowledgeItem | undefined {
  const knowledge = loadKnowledge();
  return knowledge.find(item => item.id === expression || item.name === expression);
}

/**
 * テキスト内に含まれる可能性のあるNG表現を検索
 */
export function searchNGPatterns(text: string): KnowledgeItem[] {
  const knowledge = loadKnowledge();
  const matches: KnowledgeItem[] = [];
  
  for (const item of knowledge) {
    // searchPatternsで部分一致検索
    for (const pattern of item.searchPatterns) {
      if (text.includes(pattern)) {
        matches.push(item);
        break; // 1つのアイテムで複数マッチしても1回だけ追加
      }
    }
  }
  
  return matches;
}


