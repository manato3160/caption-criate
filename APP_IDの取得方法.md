# NEXT_PUBLIC_DIFY_APP_ID について

**重要**: このアプリケーションは `mode: advanced-chat` のチャットアプリです。チャットアプリの場合、**APP_IDは不要**です。APIキーにアプリ情報が含まれているため、環境変数に設定する必要はありません。

## チャットアプリとワークフローアプリの違い

- **チャットアプリ** (`advanced-chat`): `/chat-messages` エンドポイントを使用。APP_ID不要
- **ワークフローアプリ** (`workflow`): `/workflows/{APP_ID}/run` エンドポイントを使用。APP_ID必要

## 環境変数の設定

`.env.local` ファイルには以下の2つだけを設定してください：

```env
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://dify.aibase.buzz/v1
NEXT_PUBLIC_DIFY_API_KEY=your-api-key-here
```

---

## （参考）ワークフローアプリの場合のAPP_ID取得方法

もしワークフローアプリを使用する場合の参考情報です：

## 取得方法

### 方法1: Difyダッシュボードから確認

1. Difyのダッシュボードにログイン
2. 「ワークフロー」または「アプリ」セクションに移動
3. 「キャプション生成ツール」アプリを開く
4. アプリの設定画面または詳細画面で、アプリIDを確認
   - URLに含まれている場合: `https://dify.ai/app/{APP_ID}/...`
   - 設定画面の「アプリID」または「App ID」欄

### 方法2: YMLファイルからインポートした場合

YMLファイルをDifyにインポートしてアプリを作成した場合：

1. Difyダッシュボードでインポートしたアプリを開く
2. アプリの設定画面でIDを確認
3. または、ブラウザのURLから確認：
   ```
   https://dify.ai/app/{ここがアプリID}/...
   ```

### 方法3: APIから取得

Dify APIを使用してアプリ一覧を取得：

```bash
curl -X GET "https://api.dify.ai/v1/apps" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

レスポンスから該当するアプリのIDを確認できます。

## アプリIDの形式

通常、アプリIDは以下のような形式です：
- UUID形式: `5506d3f5-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- または短い文字列形式: `abc123def456`

## 注意事項

- アプリIDは、ワークフローアプリを作成した際に自動的に生成されます
- YMLファイル自体にはアプリIDは含まれていません（インポート時に新しく生成されます）
- アプリIDは、API呼び出し時にワークフローを特定するために使用されます

## 設定例

`.env.local` ファイルに以下のように設定します：

```env
NEXT_PUBLIC_DIFY_API_ENDPOINT=https://api.dify.ai/v1
NEXT_PUBLIC_DIFY_API_KEY=app-xxxxxxxxxxxxx
NEXT_PUBLIC_DIFY_APP_ID=5506d3f5-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

