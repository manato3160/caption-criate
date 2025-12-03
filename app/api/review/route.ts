import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { loadKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key is not set. AI review will not work.');
}

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const { caption } = await request.json();

    if (!caption || typeof caption !== 'string') {
      return NextResponse.json(
        { error: 'Caption is required' },
        { status: 400 }
      );
    }

    const knowledge = loadKnowledge();
    console.log(`[review API] ナレッジ読み込み完了: ${knowledge.length}件`);
    
    // ナレッジベースの内容を詳細にプロンプト用に整形
    // 全件を使用し、コンテキスト情報も含める
    const knowledgeDetails = knowledge.map(item => {
      // ルール（備考）を抽出
      const ruleMatch = item.content.match(/##\s*ルール（備考）\s*\n([^\n]+(?:\n(?!##)[^\n]+)*)/);
      const rule = ruleMatch
        ? ruleMatch[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line.startsWith('-'))
            .map(line => line.replace(/^-\s*/, ''))
            .join(' ')
        : '';
      
      // コンテキスト：感想・口コミのOK/NG例を抽出
      const reviewContextMatch = item.content.match(/##\s*コンテキスト：感想・口コミ\s*\n([^\n]+(?:\n(?!##)[^\n]+)*)/);
      const reviewContext = reviewContextMatch
        ? reviewContextMatch[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && (line.startsWith('- **OK') || line.startsWith('- **NG')))
            .map(line => line.replace(/^-\s*\*\*/, '').replace(/\*\*:/, ':'))
            .join('\n  ')
        : '';
      
      // コンテキスト：商品説明のOK/NG例を抽出
      const productContextMatch = item.content.match(/##\s*コンテキスト：商品説明\s*\n([^\n]+(?:\n(?!##)[^\n]+)*)/);
      const productContext = productContextMatch
        ? productContextMatch[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && (line.startsWith('- **OK') || line.startsWith('- **NG')))
            .map(line => line.replace(/^-\s*\*\*/, '').replace(/\*\*:/, ':'))
            .join('\n  ')
        : '';
      
      // searchPatternsを活用（検索パターン）
      const searchPatterns = item.searchPatterns && item.searchPatterns.length > 0
        ? `検索パターン: ${item.searchPatterns.join(', ')}`
        : '';
      
      return {
        name: item.name,
        rule,
        reviewContext,
        productContext,
        searchPatterns,
      };
    });

    // プロンプトサイズを考慮しつつ、重要な情報を含める
    // 全件を簡潔にまとめる
    const knowledgeSummary = knowledgeDetails
      .map(item => {
        let summary = `【表現: ${item.name}】`;
        if (item.rule) {
          summary += `\nルール: ${item.rule}`;
        }
        if (item.searchPatterns) {
          summary += `\n${item.searchPatterns}`;
        }
        if (item.reviewContext) {
          summary += `\n感想・口コミコンテキスト:\n  ${item.reviewContext}`;
        }
        if (item.productContext) {
          summary += `\n商品説明コンテキスト:\n  ${item.productContext}`;
        }
        return summary;
      })
      .join('\n\n');

    const prompt = `あなたは化粧品広告の薬機法（薬機法）審査の専門家です。
以下のナレッジベースを参照して、提供されたキャプション本文を厳密に審査してください。

## ナレッジベース（薬機法違反の可能性がある表現とルール）

${knowledgeSummary}

## 審査対象のキャプション

${caption}

## 審査タスク

1. **詳細な検索**: キャプション本文内で、ナレッジベースに記載されているNG表現が含まれているかチェックしてください
   - 各表現の「検索パターン」を参照して、部分一致も含めて検出してください
   - 例：「明るい」「明るく」「明るさ」「明るかった」「明るくない」など、すべてのバリエーションを検出

2. **コンテキストの考慮**: 
   - キャプションが「感想・口コミ」的な表現か「商品説明」的な表現かを判断してください
   - ナレッジベースの「感想・口コミコンテキスト」と「商品説明コンテキスト」を参照し、適切に判定してください
   - コンテキストによってはOK表現の場合もあるため、慎重に判断してください

3. **正確な位置特定**: 
   - 検出されたNG表現について、キャプション本文内での正確な開始位置と終了位置を特定してください
   - 文字数は0から始まるインデックスで指定してください
   - **重要**: matchedTextは、キャプション本文内のposition.startからposition.endまでのテキストと完全に一致する必要があります
   - 例：キャプションが「朝はふんわり、夜はしっとり」の場合、「ふんわり」を検出したら、matchedText: "ふんわり"、position: { start: 2, end: 6 }と正確に指定してください

4. **詳細な情報提供**: 
   - 表現名（ナレッジベースの「表現」フィールド）
   - 該当箇所のテキスト（matchedText）: キャプション内の該当部分を**完全に一致する形で**抽出してください
   - 理由（ナレッジベースの「ルール」フィールドの内容）
   - 位置（position.startとposition.end）: matchedTextの文字列がキャプション内のposition.startからposition.endまでの範囲と完全に一致するように設定してください

## 重要な注意事項

- コンテキストによっては同じ表現でもOKの場合があります（例：メーキャップ効果の場合）
- 部分一致も含めて、すべてのバリエーションを検出してください
- **位置情報は正確に特定してください（文字列のインデックス）**
- **matchedTextとpositionは完全に一致する必要があります**: caption.substring(position.start, position.end) === matchedTextが成り立つようにしてください
- ナレッジベースのルールとコンテキスト情報を詳細に参照してください
- 改行文字や空白文字も含めて、正確な位置を特定してください

## 出力形式

以下のJSON形式で回答してください：

\`\`\`json
{
  "passed": false,
  "issues": [
    {
      "name": "表現名",
      "matchedText": "キャプション内の該当部分",
      "reason": "NG理由（ルールの内容）",
      "position": {
        "start": 開始位置（0から始まる文字インデックス）,
        "end": 終了位置（0から始まる文字インデックス）
      }
    }
  ]
}
\`\`\`

NG表現が1つも検出されない場合は、\`"passed": true, "issues": []\` を返してください。
必ず有効なJSON形式で回答してください。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: 'あなたは薬機法審査の専門家です。提供されたキャプションを厳密に審査し、JSON形式で結果を返してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    // JSONをパース
    const parsed = JSON.parse(responseText);
    
    // 型を変換し、位置情報を検証・修正
    const processedIssues = (parsed.issues || []).map((issue: any, index: number): any => {
      const matchedText = issue.matchedText || issue.name || '';
      
      if (!matchedText || matchedText.trim().length === 0) {
        return null;
      }
      
      const trimmedMatched = matchedText.trim();
      
      // 位置情報を検証し、必要に応じて修正
      let start = issue.position?.start ?? -1;
      let end = issue.position?.end ?? -1;
      
      // 位置情報が有効かどうかを検証
      const hasValidPosition = start >= 0 && end > start && end <= caption.length;
      
      // 位置情報が有効な場合、実際のテキストと完全一致するか検証
      let positionValid = false;
      if (hasValidPosition) {
        const actualText = caption.substring(start, end);
        // 完全一致を厳密にチェック（空白文字の前後は無視）
        const normalizedActual = actualText.trim();
        const normalizedMatched = trimmedMatched.trim();
        positionValid = normalizedActual === normalizedMatched;
        
        // 完全一致しない場合、実際のテキストがmatchedTextを含むか確認
        if (!positionValid) {
          positionValid = normalizedActual.includes(normalizedMatched) || normalizedMatched.includes(normalizedActual);
        }
      }
      
      // 位置情報が無効または一致しない場合、matchedTextを使ってキャプション内から正確に検索
      if (!hasValidPosition || !positionValid) {
        // まず完全一致で検索（大文字小文字を区別）
        let foundIndex = caption.indexOf(trimmedMatched);
        
        // 完全一致が見つからない場合、大文字小文字を区別しない検索
        if (foundIndex === -1) {
          const lowerCaption = caption.toLowerCase();
          const lowerSearchText = trimmedMatched.toLowerCase();
          foundIndex = lowerCaption.indexOf(lowerSearchText);
          
          // 見つかった場合、元のキャプションから正確な位置を特定
          if (foundIndex !== -1) {
            // 大文字小文字が異なる場合でも、見つかった位置を使用
            // ただし、実際のテキストの長さを確認
            const actualText = caption.substring(foundIndex, foundIndex + trimmedMatched.length);
            if (actualText.toLowerCase() === lowerSearchText) {
              start = foundIndex;
              end = foundIndex + trimmedMatched.length;
            } else {
              // 実際のテキストの長さを確認して調整
              let actualEnd = foundIndex;
              for (let i = foundIndex; i < caption.length && i < foundIndex + trimmedMatched.length * 2; i++) {
                if (caption.substring(foundIndex, i + 1).toLowerCase() === lowerSearchText) {
                  actualEnd = i + 1;
                  break;
                }
              }
              if (actualEnd > foundIndex) {
                start = foundIndex;
                end = actualEnd;
              } else {
                foundIndex = -1; // 見つからなかったことにする
              }
            }
          }
        } else {
          // 完全一致が見つかった場合
          start = foundIndex;
          end = foundIndex + trimmedMatched.length;
        }
        
        // それでも見つからない場合、部分一致を試す（ただし、これは最後の手段）
        if (foundIndex === -1 && trimmedMatched.length >= 2) {
          // より長い部分文字列から試す
          for (let len = Math.min(trimmedMatched.length, 10); len >= 2; len--) {
            const partialText = trimmedMatched.substring(0, len);
            const lowerCaption = caption.toLowerCase();
            const lowerPartial = partialText.toLowerCase();
            foundIndex = lowerCaption.indexOf(lowerPartial);
            
            if (foundIndex !== -1) {
              // 部分一致が見つかった場合、元のキャプションから正確な位置を特定
              const actualStart = caption.toLowerCase().indexOf(lowerPartial, foundIndex);
              if (actualStart !== -1) {
                // 実際のテキストの長さを確認
                const actualText = caption.substring(actualStart, actualStart + len);
                if (actualText.toLowerCase() === lowerPartial) {
                  start = actualStart;
                  end = actualStart + len;
                  break;
                }
              }
            }
          }
        }
        
        // 見つからない場合は、このissueをスキップ
        if (foundIndex === -1 || start < 0 || end <= start) {
          return null;
        }
      }
      
      // 位置情報がまだ無効な場合は、このissueをスキップ
      if (start < 0 || end < 0 || start >= end || end > caption.length) {
        return null;
      }
      
      // 最終的な位置情報で実際のテキストを取得し、matchedTextと一致するか確認
      const finalActualText = caption.substring(start, end);
      const finalMatchedText = trimmedMatched;
      
      // 最終検証：実際のテキストとmatchedTextが一致するか確認
      // 完全一致、または正規化した上での一致を確認
      const normalizedActual = finalActualText.trim().toLowerCase();
      const normalizedMatched = finalMatchedText.trim().toLowerCase();
      
      if (normalizedActual !== normalizedMatched && 
          !normalizedActual.includes(normalizedMatched) && 
          !normalizedMatched.includes(normalizedActual)) {
        // 一致しない場合、位置情報を再調整
        const reSearchIndex = caption.toLowerCase().indexOf(normalizedMatched);
        if (reSearchIndex !== -1) {
          // 再検索で見つかった場合、その位置を使用
          start = reSearchIndex;
          end = reSearchIndex + finalMatchedText.length;
        } else {
          // 見つからない場合はスキップ
          return null;
        }
      }
      
      // 位置情報の最終検証
      if (start < 0 || end <= start || end > caption.length) {
        return null;
      }
      
      // 最終的なテキストを再取得して確認
      const verifiedText = caption.substring(start, end);
      if (verifiedText.trim().length === 0) {
        return null;
      }
      
      return {
        expression: trimmedMatched,
        name: issue.name || '',
        reason: issue.reason || '薬機法に抵触する可能性があります',
        position: {
          start,
          end,
        },
        matchedText: trimmedMatched,
        knowledgeId: `ai-detected-${index}`,
      };
    }).filter((issue: any): issue is any => issue !== null);
    
    // 重複を除去：同じ位置（start, end）のものは1つだけにする
    // 位置が重複している範囲（一方が他方に含まれる）も重複として除外
    const uniqueIssues: typeof processedIssues = [];
    const seenPositions = new Set<string>();
    
    // 位置でソート（startが小さい順、同じ場合はendが小さい順）
    const sortedIssues = [...processedIssues].sort((a, b) => {
      if (a.position.start !== b.position.start) {
        return a.position.start - b.position.start;
      }
      return a.position.end - b.position.end;
    });
    
    for (const issue of sortedIssues) {
      const positionKey = `${issue.position.start}-${issue.position.end}`;
      
      // 完全に同じ位置の場合はスキップ
      if (seenPositions.has(positionKey)) {
        continue;
      }
      
      // 位置が重複している範囲（一方が他方に含まれる）をチェック
      let isDuplicate = false;
      const seenPositionsArray = Array.from(seenPositions);
      for (const seenKey of seenPositionsArray) {
        const [seenStart, seenEnd] = seenKey.split('-').map(Number);
        
        // 現在の位置が既存の位置に完全に含まれる、または既存の位置が現在の位置に完全に含まれる場合
        if (
          (issue.position.start >= seenStart && issue.position.end <= seenEnd) ||
          (seenStart >= issue.position.start && seenEnd <= issue.position.end)
        ) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seenPositions.add(positionKey);
        uniqueIssues.push(issue);
      }
    }
    
    const issues = uniqueIssues;

    return NextResponse.json({
      passed: parsed.passed ?? issues.length === 0,
      issues,
      totalIssues: issues.length,
    });
  } catch (error) {
    console.error('Review API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

