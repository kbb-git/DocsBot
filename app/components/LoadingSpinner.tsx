'use client';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'var(--primary-color)' 
}: LoadingSpinnerProps) {
  // Determine size in pixels
  const sizeInPx = {
    small: 16,
    medium: 24,
    large: 32,
  }[size];
  
  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <div
        style={{
          width: `${sizeInPx}px`,
          height: `${sizeInPx}px`,
          border: `2px solid ${color}`,
          borderBottomColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 