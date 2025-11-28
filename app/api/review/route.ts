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
      model: 'gpt-4o-mini',
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
    const issues = (parsed.issues || []).map((issue: any, index: number): any => {
      const matchedText = issue.matchedText || issue.name || '';
      
      if (!matchedText || matchedText.trim().length === 0) {
        return null;
      }
      
      // 位置情報を検証し、必要に応じて修正
      let start = issue.position?.start ?? -1;
      let end = issue.position?.end ?? -1;
      
      // 位置情報が有効かどうかを検証
      const hasValidPosition = start >= 0 && end > start && end <= caption.length;
      
      // 位置情報が有効な場合、実際のテキストと一致するか検証
      let positionValid = false;
      if (hasValidPosition) {
        const actualText = caption.substring(start, end);
        const trimmedMatched = matchedText.trim();
        // 実際のテキストとmatchedTextが一致するか、または実際のテキストにmatchedTextが含まれるか確認
        positionValid = actualText === trimmedMatched || actualText.includes(trimmedMatched) || trimmedMatched.includes(actualText);
      }
      
      // 位置情報が無効または一致しない場合、matchedTextを使ってキャプション内から検索
      if (!hasValidPosition || !positionValid) {
        const searchText = matchedText.trim();
        
        // 完全一致を優先して検索（大文字小文字を区別しない）
        let foundIndex = -1;
        const lowerCaption = caption.toLowerCase();
        const lowerSearchText = searchText.toLowerCase();
        
        // 完全一致を検索
        foundIndex = lowerCaption.indexOf(lowerSearchText);
        
        // 完全一致が見つからない場合、部分一致を試す（3文字以上）
        if (foundIndex === -1 && searchText.length >= 3) {
          // 最初の3文字で検索
          const partialText = searchText.substring(0, 3);
          foundIndex = lowerCaption.indexOf(partialText.toLowerCase());
        }
        
        // それでも見つからない場合、最初の2文字で検索
        if (foundIndex === -1 && searchText.length >= 2) {
          const partialText = searchText.substring(0, 2);
          foundIndex = lowerCaption.indexOf(partialText.toLowerCase());
        }
        
        if (foundIndex !== -1) {
          // 見つかった位置から、実際のテキストの長さを確認
          // 大文字小文字を考慮して正確な位置を特定
          const actualStart = caption.indexOf(searchText, foundIndex);
          if (actualStart !== -1) {
            start = actualStart;
            end = actualStart + searchText.length;
          } else {
            // 大文字小文字が異なる場合でも、見つかった位置を使用
            start = foundIndex;
            end = foundIndex + searchText.length;
          }
        } else {
          // 見つからない場合は、このissueをスキップ
          return null;
        }
      }
      
      // 位置情報がまだ無効な場合は、このissueをスキップ
      if (start < 0 || end < 0 || start >= end || end > caption.length) {
        return null;
      }
      
      return {
        expression: matchedText,
        name: issue.name || '',
        reason: issue.reason || '薬機法に抵触する可能性があります',
        position: {
          start,
          end,
        },
        matchedText: matchedText.trim(),
        knowledgeId: `ai-detected-${index}`,
      };
    }).filter((issue: any): issue is any => issue !== null);

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

