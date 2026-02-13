'use client';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative">
      <div className="flex justify-between items-start">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
