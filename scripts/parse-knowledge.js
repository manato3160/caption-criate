const fs = require('fs');
const path = require('path');

/**
 * SQLファイルをパースしてJSON形式に変換
 */
function parseKnowledgeSQL(sqlContent) {
  const knowledgeItems = [];
  
  // VALUESの開始位置を探す
  const valuesStart = sqlContent.indexOf('VALUES');
  if (valuesStart === -1) {
    throw new Error('VALUES句が見つかりません');
  }
  
  // VALUES以降の部分を取得
  let valuesContent = sqlContent.substring(valuesStart + 6).trim();
  
  // 各レコードをパース（'), ('で分割）
  // ただし、content内に'), ('が含まれる可能性があるので、より慎重に処理
  let currentPos = 0;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let recordStart = 0;
  
  for (let i = 0; i < valuesContent.length; i++) {
    const char = valuesContent[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === "'" && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '(') {
        if (depth === 0) {
          recordStart = i + 1;
        }
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          // レコードの終了
          const record = valuesContent.substring(recordStart, i);
          const parsed = parseRecord(record);
          if (parsed) {
            knowledgeItems.push(parsed);
          }
        }
      }
    }
  }
  
  return knowledgeItems;
}

/**
 * 単一のレコードをパース
 */
function parseRecord(record) {
  const fields = [];
  let currentField = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < record.length; i++) {
    const char = record[i];
    
    if (escapeNext) {
      currentField += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      currentField += char;
      continue;
    }
    
    if (char === "'" && !escapeNext) {
      if (inString) {
        // 文字列の終了
        fields.push(currentField);
        currentField = '';
        inString = false;
        // 次のカンマまたは終端までスキップ
        while (i < record.length - 1 && (record[i + 1] === ',' || record[i + 1] === ' ')) {
          i++;
        }
      } else {
        // 文字列の開始
        inString = true;
      }
      continue;
    }
    
    if (inString) {
      currentField += char;
    }
  }
  
  // 最後のフィールドを追加
  if (currentField) {
    fields.push(currentField);
  }
  
  if (fields.length >= 3) {
    const [id, name, content] = fields;
    
    // contentからNG表現を抽出
    const ngPatterns = extractNGPatterns(content);
    
    return {
      id,
      name,
      content,
      ngPatterns,
    };
  }
  
  return null;
}

/**
 * マークダウンのcontentからNG表現のパターンを抽出
 */
function extractNGPatterns(content) {
  const patterns = [];
  
  // NG表現の例を抽出
  const ngSectionPattern = /##\s*コンテキスト：.*?\n.*?\*\*NG表現の例:\*\*\s*([^\n]+(?:\n(?!##)[^\n]+)*)/g;
  
  let match;
  while ((match = ngSectionPattern.exec(content)) !== null) {
    const ngExamples = match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*') && !line.startsWith('-'))
      .map(line => {
        // 引用符や記号を除去
        return line.replace(/^[「『"]+|[」』"]+$/g, '').trim();
      })
      .filter(line => line.length > 0);
    
    patterns.push(...ngExamples);
  }
  
  // name自体もNG表現として追加（部分一致検出用）
  const nameMatch = content.match(/^#\s*表現：(.+)$/m);
  if (nameMatch) {
    const expressionName = nameMatch[1].trim();
    if (expressionName && !patterns.includes(expressionName)) {
      patterns.push(expressionName);
    }
  }
  
  return patterns;
}

/**
 * 部分一致検出用のパターンを生成
 */
function generateSearchPatterns(name) {
  const patterns = [];
  
  // 基本パターン
  patterns.push(name);
  
  // 活用形を考慮（簡易版）
  // 「明るい」→「明るく」「明るさ」「明るかった」など
  if (name.endsWith('い')) {
    patterns.push(name.slice(0, -1) + 'く');
    patterns.push(name.slice(0, -1) + 'さ');
    patterns.push(name.slice(0, -1) + 'かった');
    patterns.push(name.slice(0, -1) + 'くない');
  }
  
  if (name.endsWith('る')) {
    patterns.push(name.slice(0, -1) + 'った');
    patterns.push(name.slice(0, -1) + 'らない');
  }
  
  if (name.endsWith('た')) {
    patterns.push(name.slice(0, -1) + 'る');
  }
  
  return [...new Set(patterns)]; // 重複除去
}

// メイン処理
const sqlFilePath = path.join(__dirname, '..', 'knowledge_rows.sql');
const outputPath = path.join(__dirname, '..', 'data', 'knowledge.json');

// SQLファイルを読み込み
const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

// パース
const knowledgeItems = parseKnowledgeSQL(sqlContent);

// 検索パターンを追加
const enrichedKnowledge = knowledgeItems.map(item => ({
  ...item,
  searchPatterns: generateSearchPatterns(item.name),
}));

// 出力ディレクトリを作成
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// JSONファイルに書き出し
fs.writeFileSync(
  outputPath,
  JSON.stringify(enrichedKnowledge, null, 2),
  'utf-8'
);

console.log(`✅ ${enrichedKnowledge.length}件のナレッジアイテムをパースしました`);
console.log(`📁 出力先: ${outputPath}`);

