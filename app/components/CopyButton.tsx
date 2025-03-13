'use client';

import { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
}

export default function CopyButton({ textToCopy }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Create a temporary div to handle HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = textToCopy;
      
      // Get plain text content from the div
      const plainText = tempDiv.textContent || tempDiv.innerText || textToCopy;
      
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="copy-button"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {isCopied ? (
        // Checkmark icon for copied state
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M20 6L9 17L4 12" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // Copy icon for default state
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect 
            x="9" 
            y="9" 
            width="11" 
            height="11" 
            rx="2" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M5 15H4C2.89543 15 2 14.1046 2 13V5C2 3.89543 2.89543 3 4 3H12C13.1046 3 14 3.89543 14 5V6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
} 