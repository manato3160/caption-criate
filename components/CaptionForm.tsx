'use client';

import { useState } from 'react';
import type { CaptionFormData, FormErrors } from '@/lib/types';
import FileUpload from './FileUpload';

interface CaptionFormProps {
  onSubmit: (data: CaptionFormData | { edit_query: string }) => void;
  onModeChange: (mode: 'create' | 'edit') => void;
  mode: 'create' | 'edit';
  isLoading?: boolean;
  errors?: FormErrors;
}

export default function CaptionForm({
  onSubmit,
  onModeChange,
  mode,
  isLoading = false,
  errors,
}: CaptionFormProps) {
  const [formData, setFormData] = useState<CaptionFormData>({
    planning_proposal: '',
    planning_intent: '',
    ref_url1: '',
    ref_url2: '',
    ref_url3: '',
    reference_documents: [],
  });
  const [editQuery, setEditQuery] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (files: File[]) => {
    setFormData(prev => ({ ...prev, reference_documents: files }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const validationErrors: FormErrors = {};
    
    if (mode === 'create') {
      if (!formData.planning_proposal.trim()) {
        validationErrors.planning_proposal = '企画案を入力してください';
      } else if (formData.planning_proposal.length > 256) {
        validationErrors.planning_proposal = '企画案は256文字以内で入力してください';
      }
      
      if (!formData.planning_intent.trim()) {
        validationErrors.planning_intent = '企画意図を入力してください';
      } else if (formData.planning_intent.length > 10000) {
        validationErrors.planning_intent = '企画意図は10000文字以内で入力してください';
      }
      
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
      
      onSubmit(formData);
    } else {
      // 修正モード
      if (!editQuery.trim()) {
        validationErrors.general = '修正指示を入力してください';
        return;
      }
      
      onSubmit({ edit_query: editQuery });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {mode === 'create' && (
        <>
          {/* 企画案 */}
          <div>
            <label
              htmlFor="planning_proposal"
              className="block text-sm font-medium text-twany-brown mb-2"
            >
              企画案 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="planning_proposal"
              name="planning_proposal"
              value={formData.planning_proposal}
              onChange={handleChange}
              maxLength={256}
              placeholder="例: 新商品リリースキャンペーン"
              className={`
                w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                ${
                  errors?.planning_proposal
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-twany-pink focus:ring-twany-rose'
                }
              `}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              {errors?.planning_proposal && (
                <p className="text-sm text-red-600">{errors.planning_proposal}</p>
              )}
              <p className="text-xs text-twany-brown/70 ml-auto">
                {formData.planning_proposal.length}/256文字
              </p>
            </div>
          </div>

          {/* 企画意図 */}
          <div>
            <label
              htmlFor="planning_intent"
              className="block text-sm font-medium text-twany-brown mb-2"
            >
              企画意図 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="planning_intent"
              name="planning_intent"
              value={formData.planning_intent}
              onChange={handleChange}
              maxLength={10000}
              rows={6}
              placeholder="企画の意図や背景、ターゲット層などを詳しく記入してください"
              className={`
                w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-y
                ${
                  errors?.planning_intent
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-twany-pink focus:ring-twany-rose'
                }
              `}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              {errors?.planning_intent && (
                <p className="text-sm text-red-600">{errors.planning_intent}</p>
              )}
              <p className="text-xs text-twany-brown/70 ml-auto">
                {formData.planning_intent.length}/10000文字
              </p>
            </div>
          </div>

          {/* 参照URL */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-twany-brown">
              参照URL（任意）
            </h3>
            {[1, 2, 3].map(num => {
              const urlKey = `ref_url${num}` as keyof CaptionFormData;
              return (
                <div key={num}>
                  <label
                    htmlFor={urlKey}
                    className="block text-sm font-medium text-twany-brown mb-2"
                  >
                    参照URL{num === 1 ? '①' : num === 2 ? '②' : '③'}
                  </label>
                  <input
                    type="url"
                    id={urlKey}
                    name={urlKey}
                    value={formData[urlKey] as string}
                    onChange={handleChange}
                    maxLength={10000}
                    placeholder="https://example.com"
                    className={`
                      w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                      ${
                        errors?.[urlKey]
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-twany-pink focus:ring-twany-rose'
                      }
                    `}
                    disabled={isLoading}
                  />
                  {errors?.[urlKey] && (
                    <p className="text-sm text-red-600 mt-1">{errors[urlKey]}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 参照資料 */}
          <div>
            <label className="block text-sm font-medium text-twany-brown mb-2">
              参照資料（任意）<span className="text-xs text-twany-brown/70 ml-2">※公式サイトがない場合</span>
            </label>
            <FileUpload
              files={formData.reference_documents}
              onChange={handleFileChange}
              maxFiles={5}
              maxSizeMB={15}
              acceptedTypes={['image/*', 'application/pdf']}
            />
            {errors?.reference_documents && (
              <p className="text-sm text-red-600 mt-2">{errors.reference_documents}</p>
            )}
          </div>
        </>
      )}

      {mode === 'edit' && (
        <div>
          <label
            htmlFor="edit_query"
            className="block text-sm font-medium text-twany-brown mb-2"
          >
            修正指示 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="edit_query"
            name="edit_query"
            value={editQuery}
            onChange={(e) => setEditQuery(e.target.value)}
            rows={4}
            placeholder="例: 冒頭部分をもっと親しみやすい表現に変更してください"
            className="w-full px-4 py-3 border border-twany-pink rounded-lg focus:outline-none focus:ring-2 focus:ring-twany-rose transition-colors resize-y"
            disabled={isLoading}
          />
          <p className="text-xs text-twany-brown/70 mt-1">
            既存のキャプションに対する修正指示を入力してください
          </p>
        </div>
      )}

      {/* エラーメッセージ */}
      {errors?.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className={`
          w-full py-4 px-6 rounded-lg font-medium text-white transition-all
          ${
            isLoading
              ? 'bg-twany-brown/50 cursor-not-allowed'
              : 'bg-twany-rose hover:bg-twany-rose/90 shadow-md hover:shadow-lg'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            処理中...
          </span>
        ) : (
          mode === 'create' ? 'キャプションを生成' : '修正を適用'
        )}
      </button>
    </form>
  );
}

