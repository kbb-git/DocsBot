'use client';

import { RefObject, ReactNode } from 'react';
import { Message } from '../page';
import LoadingSpinner from './LoadingSpinner';
import CopyButton from './CopyButton';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  renderMessageContent?: (message: Message) => ReactNode;
}

export default function ChatMessages({ 
  messages, 
  isLoading, 
  messagesEndRef,
  renderMessageContent 
}: ChatMessagesProps) {
  // Helper function to format timestamp
  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${
            message.role === 'user' ? 'user-message' : 'bot-message'
          } ${message.isError ? 'error-message' : ''}`}
        >
          <div className="message-header">
            <span className="message-role">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <div className="message-actions">
              <CopyButton textToCopy={message.content} />
              <span className="message-time">{formatTime()}</span>
            </div>
          </div>
          
          <div className="message-content">
            {renderMessageContent ? renderMessageContent(message) : message.content}
          </div>
          
          {/* Raw API response display removed as requested */}
        </div>
      ))}
      
      {isLoading && (
        <div className="message bot-message loading">
          <LoadingSpinner size="small" />
          <span style={{ marginLeft: '0.5rem' }}>Searching documentation...</span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
} 