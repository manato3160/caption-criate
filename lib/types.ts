// フォーム入力データの型定義
export interface CaptionFormData {
  planning_proposal: string;
  planning_intent: string;
  ref_url1: string;
  ref_url2: string;
  ref_url3: string;
  reference_documents: File[];
}

// キャプション生成モード
export type CaptionMode = 'create' | 'edit';

// Dify API関連の型定義
export interface DifyWorkflowRequest {
  inputs: {
    planning_proposal: string;
    planning_intent: string;
    ref_url1: string;
    ref_url2: string;
    ref_url3: string;
  };
  files?: Array<{
    type: string;
    transfer_method: string;
    url?: string;
  }>;
  response_mode?: 'blocking' | 'streaming';
  user?: string;
}

export interface DifyWorkflowResponse {
  task_id: string;
  workflow_run_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string;
    outputs: {
      answer?: string;
      text?: string;
    };
    error?: string;
  };
}

export interface DifyFile {
  type: string;
  transfer_method: string;
  upload_file_id?: string;
  url?: string;
}

export interface DifyChatRequest {
  inputs: {
    planning_proposal?: string;
    planning_intent?: string;
    ref_url1?: string;
    ref_url2?: string;
    ref_url3?: string;
    reference_documents?: DifyFile[]; // ファイルリスト型の変数（inputs内）
    query?: string;
  };
  query: string;
  response_mode?: 'blocking' | 'streaming';
  conversation_id?: string;
  user?: string;
  files?: DifyFile[]; // トップレベルのfiles配列（sys.filesとして参照される）
}

export interface DifyChatResponse {
  event: string;
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  answer: string;
  created_at: number;
}

// APIエラーの型定義
export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// フォームバリデーションエラーの型定義
export interface FormErrors {
  planning_proposal?: string;
  planning_intent?: string;
  ref_url1?: string;
  ref_url2?: string;
  ref_url3?: string;
  reference_documents?: string;
  general?: string;
}

// 薬機審査関連の型定義
export interface KnowledgeItem {
  id: string;
  name: string;
  content: string;
  ngPatterns: string[];
  searchPatterns: string[];
}

export interface DetectedIssue {
  expression: string;
  name: string;
  reason: string;
  position: {
    start: number;
    end: number;
  };
  matchedText: string;
  knowledgeId: string;
}

export interface ReviewResult {
  passed: boolean;
  issues: DetectedIssue[];
  totalIssues: number;
}

// ハッシュタグ生成関連の型定義
export interface HashtagResult {
  hashtags: string[];
  fixedHashtags: string[];
  selectedHashtags: string[];
}

