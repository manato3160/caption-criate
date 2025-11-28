'use client';

import { useCallback, useState } from 'react';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export default function FileUpload({
  files,
  onChange,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf'],
  maxSizeMB = 15,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // ファイルサイズチェック
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `ファイルサイズが大きすぎます（最大${maxSizeMB}MB）`;
    }

    // ファイルタイプチェック
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(`${baseType}/`);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return 'サポートされていないファイル形式です';
    }

    return null;
  };

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];

      // 既存のファイル数と追加可能なファイル数を確認
      const remainingSlots = maxFiles - files.length;
      if (remainingSlots <= 0) {
        setError(`最大${maxFiles}ファイルまでアップロードできます`);
        return;
      }

      // ファイル数制限チェック
      const filesToAdd = fileArray.slice(0, remainingSlots);
      if (fileArray.length > remainingSlots) {
        setError(`${remainingSlots}ファイルのみ追加できます（最大${maxFiles}ファイル）`);
      }

      // 各ファイルを検証
      for (const file of filesToAdd) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onChange([...files, ...validFiles]);
      }
    },
    [files, onChange, maxFiles, maxSizeMB, acceptedTypes]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      onChange(newFiles);
    },
    [files, onChange]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-twany-rose bg-twany-cream' : 'border-twany-pink bg-white'}
          hover:border-twany-rose cursor-pointer
        `}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={files.length >= maxFiles}
        />
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-twany-rose"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h12m-4 4v12m0 0l-4-4m4 4l4-4"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm text-twany-brown">
            <span className="font-semibold">ファイルをドラッグ&ドロップ</span>
            またはクリックして選択
          </p>
          <p className="text-xs text-twany-brown/70 mt-1">
            画像・PDF（最大{maxSizeMB}MB、最大{maxFiles}ファイル）
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-twany-brown">
            アップロード済みファイル ({files.length}/{maxFiles})
          </p>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-white border border-twany-pink rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <svg className="h-6 w-6 text-twany-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-twany-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-twany-brown truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-twany-brown/70">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="ml-4 flex-shrink-0 text-twany-rose hover:text-red-600 transition-colors"
                aria-label="ファイルを削除"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

