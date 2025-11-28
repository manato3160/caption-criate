import type {
  DifyWorkflowRequest,
  DifyWorkflowResponse,
  DifyChatRequest,
  DifyChatResponse,
  ApiError,
} from './types';

const API_ENDPOINT = process.env.NEXT_PUBLIC_DIFY_API_ENDPOINT || '';
const API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
// チャットアプリの場合、APP_IDはAPIキーに含まれているため不要

/**
 * APIエラークラス
 */
export class DifyApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'DifyApiError';
  }
}

/**
 * ファイルをDify APIにアップロード
 */
async function uploadFile(file: File): Promise<string> {
  if (!API_ENDPOINT || !API_KEY) {
    throw new DifyApiError(
      500,
      'CONFIG_ERROR',
      'API設定が不完全です。環境変数を確認してください。'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', 'user');

  const response = await fetch(`${API_ENDPOINT}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new DifyApiError(
      response.status,
      errorData.code || 'UPLOAD_ERROR',
      errorData.message || `ファイルアップロードエラー: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.id; // upload_file_idを返す
}

/**
 * ファイルをDify API形式に変換（アップロード済みファイルIDを使用）
 */
async function prepareFiles(files: File[]): Promise<Array<{
  type: string;
  transfer_method: string;
  upload_file_id: string;
}>> {
  const preparedFiles = [];
  
  for (const file of files) {
    const fileId = await uploadFile(file);
    
    preparedFiles.push({
      type: file.type.startsWith('image/') ? 'image' : 'document',
      transfer_method: 'local_file',
      upload_file_id: fileId,
    });
  }
  
  return preparedFiles;
}

/**
 * チャットAPIを呼び出す（新規作成モード用）
 * チャットアプリの場合は /chat-messages エンドポイントを使用
 */
export async function runWorkflow(
  inputs: DifyWorkflowRequest['inputs'],
  files: File[] = []
): Promise<{ answer: string; conversationId: string }> {
  if (!API_ENDPOINT || !API_KEY) {
    throw new DifyApiError(
      500,
      'CONFIG_ERROR',
      'API設定が不完全です。環境変数を確認してください。'
    );
  }

  try {
    // ファイルがある場合は先にアップロード
    let preparedFiles: Array<{
      type: string;
      transfer_method: string;
      upload_file_id: string;
    }> = [];
    
    if (files.length > 0) {
      preparedFiles = await prepareFiles(files);
    }

    // inputsオブジェクトを構築
    // Dify APIはinputs内にreference_documents（ファイルリスト型）を要求している
    // reference_documentsは常に配列として設定（ファイルがない場合は空配列[]）
    const inputsObj: Record<string, any> = {
      planning_proposal: inputs.planning_proposal || '',
      planning_intent: inputs.planning_intent || '',
      ref_url1: inputs.ref_url1 || '',
      ref_url2: inputs.ref_url2 || '',
      ref_url3: inputs.ref_url3 || '',
      reference_documents: preparedFiles, // ファイルリスト型の変数（空配列でも可）
    };

    const requestBody: DifyChatRequest = {
      inputs: inputsObj as DifyChatRequest['inputs'],
      query: 'キャプション生成', // トリガーメッセージ
      response_mode: 'blocking',
      user: 'user',
    };

    // トップレベルのfiles配列にも設定（sys.filesとして参照される）
    if (preparedFiles.length > 0) {
      requestBody.files = preparedFiles;
    }

    // 開発環境でリクエストボディをログ出力（デバッグ用）
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dify API] Request body:', JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(
      `${API_ENDPOINT}/chat-messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 開発環境でエラー詳細をログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('[Dify API] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestBody: JSON.stringify(requestBody, null, 2),
        });
      }
      
      throw new DifyApiError(
        response.status,
        errorData.code || 'UNKNOWN_ERROR',
        errorData.message || `APIエラー: ${response.statusText}`
      );
    }

    const data: DifyChatResponse = await response.json();
    
    return {
      answer: data.answer,
      conversationId: data.conversation_id,
    };
  } catch (error) {
    if (error instanceof DifyApiError) {
      throw error;
    }
    throw new DifyApiError(
      500,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました'
    );
  }
}


/**
 * チャットAPIを呼び出す（修正モード用）
 */
export async function sendChatMessage(
  query: string,
  conversationId?: string,
  inputs?: DifyWorkflowRequest['inputs']
): Promise<{ answer: string; conversationId: string }> {
  if (!API_ENDPOINT || !API_KEY) {
    throw new DifyApiError(
      500,
      'CONFIG_ERROR',
      'API設定が不完全です。環境変数を確認してください。'
    );
  }

  try {
    // inputsが提供されている場合はそれを使用、なければ空のオブジェクト
    // ただし、必須フィールド（planning_proposal, planning_intent）は空文字列でも設定する
    const inputsObj: Record<string, any> = inputs
      ? {
          planning_proposal: inputs.planning_proposal || '',
          planning_intent: inputs.planning_intent || '',
          ref_url1: inputs.ref_url1 || '',
          ref_url2: inputs.ref_url2 || '',
          ref_url3: inputs.ref_url3 || '',
          reference_documents: [], // 修正時はファイルは不要
        }
      : {
          planning_proposal: '',
          planning_intent: '',
          ref_url1: '',
          ref_url2: '',
          ref_url3: '',
          reference_documents: [],
        };

    const requestBody: DifyChatRequest = {
      inputs: inputsObj as DifyChatRequest['inputs'],
      query,
      response_mode: 'blocking',
      user: 'user',
    };

    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const response = await fetch(
      `${API_ENDPOINT}/chat-messages`,
      {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new DifyApiError(
        response.status,
        errorData.code || 'UNKNOWN_ERROR',
        errorData.message || `APIエラー: ${response.statusText}`
      );
    }

    const data: DifyChatResponse = await response.json();
    
    return {
      answer: data.answer,
      conversationId: data.conversation_id,
    };
  } catch (error) {
    if (error instanceof DifyApiError) {
      throw error;
    }
    throw new DifyApiError(
      500,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'ネットワークエラーが発生しました'
    );
  }
}

