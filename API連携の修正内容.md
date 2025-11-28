# API連携の修正内容

## 問題点

Dify APIドキュメントを確認した結果、以下の問題が発見されました：

1. **エンドポイントの誤り**: `mode: advanced-chat` のチャットアプリなのに、ワークフローAPI (`/workflows/${APP_ID}/run`) を使用していた
2. **ファイルアップロード方法の誤り**: Base64のdata URLを使用していたが、正しくは `/files/upload` エンドポイントでアップロードして `upload_file_id` を使用する必要がある
3. **APP_IDの不要性**: チャットアプリの場合、APP_IDは不要（APIキーに含まれている）

## 修正内容

### 1. エンドポイントの変更

**修正前:**
```typescript
`${API_ENDPOINT}/workflows/${APP_ID}/run?user=user`
```

**修正後:**
```typescript
`${API_ENDPOINT}/chat-messages?user=user`
```

### 2. ファイルアップロードの実装

**修正前:** Base64のdata URLを直接使用
```typescript
const dataUrl = `data:${file.type};base64,${base64}`;
preparedFiles.push({
  type: 'image',
  transfer_method: 'local_file',
  url: dataUrl,
});
```

**修正後:** `/files/upload` エンドポイントでアップロードしてIDを取得
```typescript
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', 'user');
  
  const response = await fetch(`${API_ENDPOINT}/files/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData,
  });
  
  const data = await response.json();
  return data.id; // upload_file_id
}
```

### 3. リクエストボディの修正

**新規作成時:**
```typescript
{
  inputs: {
    planning_proposal: "...",
    planning_intent: "...",
    ref_url1: "...",
    ref_url2: "...",
    ref_url3: "..."
  },
  query: "キャプション生成", // トリガーメッセージ
  response_mode: "blocking",
  user: "user",
  files: [
    {
      type: "image",
      transfer_method: "local_file",
      upload_file_id: "..." // アップロード済みファイルID
    }
  ]
}
```

**修正時:**
```typescript
{
  inputs: {},
  query: "修正指示の内容",
  response_mode: "blocking",
  user: "user",
  conversation_id: "..." // 会話を継続する場合
}
```

### 4. 環境変数の変更

**修正前:**
```env
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api.dify.ai/v1
NEXT_PUBLIC_DIFY_API_KEY=your-api-key-here
NEXT_PUBLIC_DIFY_APP_ID=your-app-id-here  # 不要
```

**修正後:**
```env
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://dify.aibase.buzz/v1
NEXT_PUBLIC_DIFY_API_KEY=your-api-key-here
# APP_IDは不要（チャットアプリの場合）
```

## 確認事項

- [x] エンドポイントを `/chat-messages` に変更
- [x] ファイルアップロード機能を実装
- [x] `inputs` パラメータにフォームデータを渡すように修正
- [x] `query` パラメータに適切な値を設定
- [x] APP_IDの依存を削除
- [x] エラーハンドリングを維持

## 動作確認

修正後、以下の動作を確認してください：

1. 新規キャプション生成が正常に動作するか
2. ファイルアップロードが正常に動作するか
3. キャプション修正が正常に動作するか
4. 会話の継続（conversation_id）が正常に動作するか


