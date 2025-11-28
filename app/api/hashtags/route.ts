import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getFixedHashtags, getNonFixedHashtags } from '@/lib/hashtags';

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key is not set. Hashtag generation will not work.');
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

    // 固定ワードを取得（最大4個）
    const fixedHashtags = getFixedHashtags();
    
    // 固定ワード以外のキーワードリストを取得
    const nonFixedHashtags = getNonFixedHashtags();

    if (nonFixedHashtags.length === 0) {
      return NextResponse.json({
        hashtags: fixedHashtags,
        fixedHashtags,
        selectedHashtags: [],
      });
    }

    // AIでキャプションに沿うハッシュタグを17個選択
    const prompt = `あなたはInstagramのハッシュタグ選定の専門家です。
以下のキャプション本文を分析して、提供されたキーワードリストから、キャプションの内容に最も関連性の高い17個のハッシュタグを選択してください。

## キャプション本文

${caption}

## 選択可能なキーワードリスト

${nonFixedHashtags.map((keyword, index) => `${index + 1}. ${keyword}`).join('\n')}

## 選択条件

1. キャプションの内容に最も関連性の高い17個を選択してください
2. 重複は避けてください
3. キャプションの内容と関連性が低いものは避けてください
4. キーワードリストに記載されているもののみを選択してください（新規作成は禁止）
5. 選択したキーワードは、そのままの形式で返してください（#は付けない）

## 出力形式

以下のJSON形式で回答してください：

\`\`\`json
{
  "selectedHashtags": ["キーワード1", "キーワード2", "キーワード3", ...]
}
\`\`\`

必ず17個のキーワードを選択してください。17個未満の場合は、関連性が高い順に17個になるまで選択してください。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたはInstagramのハッシュタグ選定の専門家です。提供されたキャプションを分析し、キーワードリストから最も関連性の高い17個のハッシュタグを選択してJSON形式で返してください。',
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
    const selectedHashtags = parsed.selectedHashtags || [];

    // 選択されたハッシュタグがキーワードリストに含まれているか検証
    const validSelectedHashtags = selectedHashtags
      .filter((hashtag: string) => 
        typeof hashtag === 'string' && 
        nonFixedHashtags.includes(hashtag.trim())
      )
      .map((hashtag: string) => hashtag.trim())
      .slice(0, 17); // 最大17個まで

    // 固定ワードと選択されたハッシュタグを結合
    const allHashtags = [...fixedHashtags, ...validSelectedHashtags];

    return NextResponse.json({
      hashtags: allHashtags,
      fixedHashtags,
      selectedHashtags: validSelectedHashtags,
    });
  } catch (error) {
    console.error('Hashtag API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

