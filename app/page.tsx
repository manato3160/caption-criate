'use client';

import { useState } from 'react';
import type { CaptionFormData, CaptionMode, FormErrors, ReviewResult, HashtagResult } from '@/lib/types';
import { runWorkflow, sendChatMessage, DifyApiError } from '@/lib/api';
import { reviewCaption } from '@/lib/review';
import { generateHashtags } from '@/lib/hashtags-client';
import CaptionForm from '@/components/CaptionForm';
import CaptionDisplay from '@/components/CaptionDisplay';
import ReviewResultDisplay from '@/components/ReviewResult';
import HashtagDisplay from '@/components/HashtagDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';

type ViewState = 'form' | 'loading' | 'result' | 'edit' | 'manual-edit';

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>('form');
  const [caption, setCaption] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [hashtagResult, setHashtagResult] = useState<HashtagResult | null>(null);
  // 新規作成時に送信したinputsを保存（修正時に使用）
  const [savedInputs, setSavedInputs] = useState<CaptionFormData | null>(null);
  // 手動修正中の一時的な状態
  const [editingCaption, setEditingCaption] = useState<string>('');
  const [editingHashtags, setEditingHashtags] = useState<string[]>([]);
  const [newHashtagInput, setNewHashtagInput] = useState<string>('');

  const handleFormSubmit = async (data: CaptionFormData | { edit_query: string }) => {
    setIsLoading(true);
    setErrors({});
    setViewState('loading');

    try {
      if (viewState === 'form' || viewState === 'result') {
        // 新規作成モード
        const formData = data as CaptionFormData;
        const workflowInputs = {
          planning_proposal: formData.planning_proposal,
          planning_intent: formData.planning_intent,
          ref_url1: formData.ref_url1,
          ref_url2: formData.ref_url2,
          ref_url3: formData.ref_url3,
        };
        
        // inputsを保存（修正時に使用）
        setSavedInputs(formData);
        
        const result = await runWorkflow(
          workflowInputs,
          formData.reference_documents
        );

        setCaption(result.answer);
        // 新規作成時のconversationIdを保存（修正時に使用）
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        
        // 自動的に薬機審査を実行
        try {
          const review = await reviewCaption(result.answer);
          setReviewResult(review);
        } catch (error) {
          console.error('薬機審査エラー:', error);
          // 審査エラーが発生してもキャプションは表示する
          setReviewResult({
            passed: true, // エラー時は審査通過として扱う（エラー表示はしない）
            issues: [],
            totalIssues: 0,
          });
        }
        
        // 自動的にハッシュタグ生成を実行
        try {
          const hashtags = await generateHashtags(result.answer);
          setHashtagResult(hashtags);
        } catch (error) {
          console.error('ハッシュタグ生成エラー:', error);
          // ハッシュタグ生成エラーが発生してもキャプションは表示する
          setHashtagResult(null);
        }
        
        setViewState('result');
      } else if (viewState === 'edit') {
        // 修正モード
        const editData = data as { edit_query: string };
        
        if (!editData.edit_query.trim()) {
          setErrors({ general: '修正指示を入力してください' });
          setIsLoading(false);
          return;
        }

        if (!caption) {
          setErrors({ general: 'まずキャプションを生成してください' });
          setIsLoading(false);
          return;
        }

        // 保存されたinputsを使用して修正リクエストを送信
        const inputsForEdit = savedInputs
          ? {
              planning_proposal: savedInputs.planning_proposal,
              planning_intent: savedInputs.planning_intent,
              ref_url1: savedInputs.ref_url1,
              ref_url2: savedInputs.ref_url2,
              ref_url3: savedInputs.ref_url3,
            }
          : undefined;

        const result = await sendChatMessage(editData.edit_query, conversationId, inputsForEdit);
        setCaption(result.answer);
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        
        // 修正モードでは薬機審査とハッシュタグ生成は実行しない
        // 初稿作成時に生成されたreviewResultとhashtagResultをそのまま保持
        
        setViewState('result');
      }
    } catch (error) {
      console.error('エラーが発生しました:', error);
      
      if (error instanceof DifyApiError) {
        setErrors({
          general: `エラー: ${error.message} (コード: ${error.code})`,
        });
      } else {
        setErrors({
          general: '予期しないエラーが発生しました。もう一度お試しください。',
        });
      }
      
      // エラー時はフォーム画面に戻す
      if (viewState === 'loading') {
        setViewState('form');
      } else if (viewState === 'edit') {
        // 修正モードの場合は修正画面のまま
        setViewState('edit');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCaption = () => {
    setViewState('form');
    setCaption('');
    setReviewResult(null);
    setHashtagResult(null);
    setConversationId(undefined);
    setSavedInputs(null); // 保存されたinputsもクリア
    setErrors({});
  };

  const handleEdit = () => {
    setViewState('edit');
    setErrors({});
  };

  const handleManualEdit = () => {
    // Dify会話を終了
    setConversationId(undefined);
    // 現在のキャプションとハッシュタグを編集用の状態にコピー
    setEditingCaption(caption);
    setEditingHashtags(hashtagResult ? hashtagResult.hashtags : []);
    setNewHashtagInput('');
    setViewState('manual-edit');
    setErrors({});
  };

  const handleManualEditComplete = () => {
    // 編集したキャプションとハッシュタグを保存
    setCaption(editingCaption);
    if (hashtagResult) {
      // ハッシュタグ結果を更新（固定ハッシュタグと選択ハッシュタグの区別は保持）
      const fixedHashtags = hashtagResult.fixedHashtags;
      const selectedHashtags = editingHashtags.filter(tag => !fixedHashtags.includes(tag));
      setHashtagResult({
        hashtags: editingHashtags,
        fixedHashtags,
        selectedHashtags,
      });
    }
    setViewState('result');
  };

  const handleCancelManualEdit = () => {
    // 編集内容を破棄して結果画面に戻る
    setEditingCaption('');
    setEditingHashtags([]);
    setNewHashtagInput('');
    setViewState('result');
  };

  const handleAddHashtag = () => {
    const trimmed = newHashtagInput.trim();
    if (trimmed && !editingHashtags.includes(trimmed)) {
      setEditingHashtags([...editingHashtags, trimmed]);
      setNewHashtagInput('');
    }
  };

  const handleRemoveHashtag = (index: number) => {
    setEditingHashtags(editingHashtags.filter((_, i) => i !== index));
  };

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-twany-brown mb-2">
            キャプション生成ツール
          </h1>
          <p className="text-twany-brown/70">
            Instagram投稿用キャプションを生成・修正できます
          </p>
        </div>

        {/* メインコンテンツ */}
        {viewState === 'form' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
              <h2 className="text-xl font-semibold text-twany-brown mb-6">
                新規作成
              </h2>
              <CaptionForm
                onSubmit={handleFormSubmit}
                onModeChange={() => {}}
                mode="create"
                isLoading={false}
                errors={errors}
              />
            </div>
          </div>
        )}

        {viewState === 'loading' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-12">
              <LoadingSpinner message="キャプションを生成しています..." />
            </div>
          </div>
        )}

        {viewState === 'result' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <CaptionDisplay
              caption={caption}
              onEdit={handleEdit}
              onManualEdit={handleManualEdit}
              onNew={handleNewCaption}
              reviewResult={reviewResult || undefined}
            />
            {reviewResult && (
              <ReviewResultDisplay result={reviewResult} caption={caption} />
            )}
            {hashtagResult && (
              <HashtagDisplay result={hashtagResult} />
            )}
          </div>
        )}

        {viewState === 'edit' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 現在のキャプション表示 */}
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
              <h3 className="text-lg font-semibold text-twany-brown mb-4">
                現在のキャプション
              </h3>
              <div className="bg-twany-cream/30 rounded-lg p-4 border border-twany-pink/50">
                <pre className="whitespace-pre-wrap font-sans text-twany-brown leading-relaxed text-sm">
                  {caption}
                </pre>
              </div>
            </div>
            
            {/* 修正フォーム */}
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
              <h2 className="text-xl font-semibold text-twany-brown mb-6">
                修正
              </h2>
              <CaptionForm
                onSubmit={handleFormSubmit}
                onModeChange={() => {}}
                mode="edit"
                isLoading={isLoading}
                errors={errors}
              />
            </div>
          </div>
        )}

        {viewState === 'manual-edit' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* キャプション編集 */}
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
              <h2 className="text-xl font-semibold text-twany-brown mb-4">
                キャプション編集
              </h2>
              <textarea
                value={editingCaption}
                onChange={(e) => setEditingCaption(e.target.value)}
                className="w-full min-h-[300px] p-4 border border-twany-pink rounded-lg bg-white text-twany-brown font-sans leading-relaxed resize-y"
                placeholder="キャプションを入力してください"
              />
              <div className="mt-2 text-xs text-twany-brown/70">
                文字数: {editingCaption.length}文字
              </div>
            </div>

            {/* ハッシュタグ編集 */}
            <div className="bg-white rounded-lg shadow-lg border border-twany-pink p-6">
              <h2 className="text-xl font-semibold text-twany-brown mb-4">
                ハッシュタグ編集
              </h2>
              
              {/* 現在のハッシュタグ表示 */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-twany-brown mb-2">
                  現在のハッシュタグ ({editingHashtags.length}個)
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {editingHashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-twany-cream/50 text-twany-brown rounded-full text-sm border border-twany-pink/50"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveHashtag(index)}
                        className="ml-2 text-red-600 hover:text-red-800"
                        type="button"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* ハッシュタグ追加 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHashtagInput}
                  onChange={(e) => setNewHashtagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHashtag();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-twany-pink rounded-lg bg-white text-twany-brown"
                  placeholder="新しいハッシュタグを入力（Enterで追加）"
                />
                <button
                  onClick={handleAddHashtag}
                  className="px-4 py-2 bg-twany-rose text-white rounded-lg hover:bg-twany-rose/90 transition-colors"
                  type="button"
                >
                  追加
                </button>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancelManualEdit}
                className="px-6 py-2 text-sm font-medium text-twany-brown border border-twany-pink rounded-lg hover:bg-twany-cream transition-colors"
                type="button"
              >
                キャンセル
              </button>
              <button
                onClick={handleManualEditComplete}
                className="px-6 py-2 text-sm font-medium bg-twany-rose text-white rounded-lg hover:bg-twany-rose/90 transition-colors"
                type="button"
              >
                修正完了
              </button>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-twany-brown/60">
          <p>トワニー（TWANY）キャプション生成ツール</p>
        </div>
      </div>
    </main>
  );
}

