'use client';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = '処理中...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-twany-rose"></div>
        <div className="absolute top-0 left-0 rounded-full h-16 w-16 border-t-2 border-twany-pink animate-spin" style={{ animationDirection: 'reverse' }}></div>
      </div>
      <p className="mt-4 text-twany-brown font-medium">{message}</p>
    </div>
  );
}

