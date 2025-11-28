import fs from 'fs';
import path from 'path';

const CSV_FILE_PATH = path.join(process.cwd(), 'ハッシュタグ.csv');

interface HashtagKeyword {
  keyword: string;
  isFixed: boolean;
}

/**
 * CSVファイルを読み込んでパースする
 */
function loadHashtagKeywords(): HashtagKeyword[] {
  try {
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);
    
    const keywords: HashtagKeyword[] = [];
    
    for (const line of dataLines) {
      // カンマで分割（空の行はスキップ）
      if (!line) continue;
      
      const parts = line.split(',');
      const keyword = parts[0]?.trim();
      
      if (!keyword) continue;
      
      // 2列目に「固定」が含まれているかチェック
      const isFixed = parts[1]?.trim() === '固定';
      
      keywords.push({
        keyword,
        isFixed,
      });
    }
    
    return keywords;
  } catch (error) {
    console.error('ハッシュタグCSVファイルの読み込みエラー:', error);
    return [];
  }
}

/**
 * 固定ワードを取得する（最大4個）
 */
export function getFixedHashtags(): string[] {
  const keywords = loadHashtagKeywords();
  const fixedKeywords = keywords
    .filter(item => item.isFixed)
    .map(item => item.keyword);
  
  // 最大4個まで返す
  return fixedKeywords.slice(0, 4);
}

/**
 * 固定ワード以外のキーワードリストを取得する
 */
export function getNonFixedHashtags(): string[] {
  const keywords = loadHashtagKeywords();
  return keywords
    .filter(item => !item.isFixed)
    .map(item => item.keyword)
    .filter(keyword => keyword.length > 0); // 空文字列を除外
}


