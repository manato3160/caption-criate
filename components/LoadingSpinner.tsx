'use client';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = '処理中...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-8">
      {/* 上品なローディングアニメーション */}
      <div className="relative w-20 h-20">
        {/* 外側のリング */}
        <div className="absolute inset-0 rounded-full border-2 border-twany-cream/30"></div>
        {/* メインのリング */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-twany-rose/60 border-r-twany-pink/40 animate-spin" style={{ animationDuration: '1.2s' }}></div>
        {/* 内側のアクセント */}
        <div className="absolute inset-2 rounded-full border border-twany-brown/10"></div>
        {/* 中央のドット */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-twany-rose/40 animate-pulse"></div>
        </div>
      </div>
      
      {/* メッセージ */}
      <div className="text-center space-y-2">
        <p className="text-twany-brown/90 text-lg font-light tracking-wide">{message}</p>
        <div className="flex items-center justify-center space-x-1 pt-2">
          <div className="w-1 h-1 rounded-full bg-twany-brown/40 animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="w-1 h-1 rounded-full bg-twany-brown/40 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 rounded-full bg-twany-brown/40 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

