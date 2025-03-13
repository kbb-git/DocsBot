'use client';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="message bot-message" style={{ 
      backgroundColor: '#fff8f8', 
      border: '1px solid #ffdddd',
      color: '#d32f2f'
    }}>
      <p style={{ marginBottom: onRetry ? '0.75rem' : '0' }}>
        <strong>Error:</strong> {message}
      </p>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #d32f2f',
            color: '#d32f2f',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
} 