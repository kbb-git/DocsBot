'use client';

import { useState, useRef, useEffect } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import ErrorDisplay from './components/ErrorDisplay';
import Header from './components/Header';

// Message type
export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  isError?: boolean;
  hasVectorStoreError?: boolean;
  vectorStoreErrorMessage?: string;
  rawApiResponse?: any;
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m the Checkout Docs Helper. How can I assist you with Checkout.com documentation today?',
      role: 'assistant',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add a cache to store formatted message content and prevent duplicate processing
  const formattedContentCache = useRef(new Map<string, string>());
  
  // Function to clear cache for a specific message ID
  const clearCacheForMessage = (messageId: string) => {
    // Find and remove all cache entries for this message ID
    const keysToRemove: string[] = [];
    formattedContentCache.current.forEach((_, key) => {
      if (key.startsWith(`${messageId}-`)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      formattedContentCache.current.delete(key);
      console.log(`Cleared cache for key: ${key}`);
    });
  };
  
  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevents the default error being shown
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    // Add cleanup for any pending operations to prevent message channel errors
    let isMounted = true;
    
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    return () => {
      // Set flag to prevent operations after component unmounts
      isMounted = false;
    };
  }, [messages]);

  // Handle retry for failed messages
  const handleRetry = async () => {
    if (!lastUserMessage) return;
    
    // Remove the error message
    setMessages(prev => prev.filter(msg => !msg.isError));
    
    // Retry the last user message
    await handleSendMessage(lastUserMessage);
  };

  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Save the last user message for retry functionality
    setLastUserMessage(content);

    // Generate a simple ID
    const userMessageId = Date.now().toString();
    
    // Add user message to state
    const userMessage: Message = {
      id: userMessageId,
      content,
      role: 'user',
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send message to API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Log the raw API response for debugging
      console.log("Raw API response from server:", JSON.stringify({
        hasResponse: !!data.response,
        responseLength: data.response ? data.response.length : 0,
        hasRawApiResponse: !!data.raw_api_response,
        hasFullResponse: data.raw_api_response ? !!data.raw_api_response.fullResponse : false,
        hasOutputText: data.raw_api_response && data.raw_api_response.fullResponse ? !!data.raw_api_response.fullResponse.output_text : false,
        outputTextLength: data.raw_api_response && data.raw_api_response.fullResponse && data.raw_api_response.fullResponse.output_text ? data.raw_api_response.fullResponse.output_text.length : 0
      }));
      
      // Generate a unique ID for the bot message
      const botMessageId = (Date.now() + 1).toString();
      
      // Clear any existing cache for this message ID
      clearCacheForMessage(botMessageId);
      
      // Add bot response to state with vector store error info if present
      const botMessage: Message = {
        id: botMessageId,
        content: data.response,
        role: 'assistant',
        hasVectorStoreError: data.vectorStoreError ? true : false,
        vectorStoreErrorMessage: data.vectorStoreError?.message || '',
        rawApiResponse: data.raw_api_response
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'assistant',
        isError: true,
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format message content with better styling
  const formatMessageContent = (content: string) => {
    // Add debug logging for API response codes
    if (content.includes("API response codes for soft declines from Checkout.com")) {
      console.log("Detected API response codes content");
      console.log("Content length:", content.length);
      
      // Count code items
      const codeItemMatches = content.match(/\*\*\d+\*\*/g) || [];
      console.log("Number of API code items found:", codeItemMatches.length);
      console.log("API codes:", codeItemMatches.map(m => m.replace(/\*\*/g, '')).join(', '));
    }
    
    // Special handling for API response codes from Checkout.com
    if (content.includes("API response codes for soft declines from Checkout.com")) {
      // Create a completely custom HTML output for this specific case
      // This bypasses the normal formatting process for guaranteed display
      try {
        // Use a line-by-line approach instead of complex regex
        interface ApiCode {
          code: string;
          reason: string;
          description: string;
        }
        
        const apiCodes: ApiCode[] = [];
        const lines = content.split('\n');
        
        // Log the actual lines for debugging
        console.log("Raw content lines:", lines);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip empty lines or titles
          if (!line || line.includes("API response codes for soft declines")) {
            continue;
          }
          
          // Match different possible patterns for API code lines
          const bulletPattern = /^-\s+\*\*(\d+)\*\*:?\s*(.*?)$/;
          const bulletWithEmphasisPattern = /^-\s+\*\*(\d+)\*\*\s*-\s*\*([^*]+)\*:?\s*(.*?)$/;
          const numberedPattern = /^\d+\.\s+\*\*(\d+)\*\*:?\s*(.*?)$/;
          const numberedWithEmphasisPattern = /^\d+\.\s+\*\*(\d+)\*\*\s*-\s*\*([^*]+)\*:?\s*(.*?)$/;
          
          let code = null;
          let reason = null;
          let description = null;
          
          if (bulletWithEmphasisPattern.test(line)) {
            const match = line.match(bulletWithEmphasisPattern);
            if (match) {
              code = match[1];
              reason = match[2];
              description = match[3] || '';
            }
          } else if (numberedWithEmphasisPattern.test(line)) {
            const match = line.match(numberedWithEmphasisPattern);
            if (match) {
              code = match[1];
              reason = match[2];
              description = match[3] || '';
            }
          } else if (bulletPattern.test(line)) {
            const match = line.match(bulletPattern);
            if (match) {
              code = match[1];
              
              // Check if description contains an emphasized part
              const descParts = (match[2] || '').split(' - ');
              if (descParts.length > 1 && descParts[0].startsWith('*') && descParts[0].endsWith('*')) {
                reason = descParts[0].replace(/^\*|\*$/g, '');
                description = descParts.slice(1).join(' - ');
              } else {
                description = match[2] || '';
              }
            }
          } else if (numberedPattern.test(line)) {
            const match = line.match(numberedPattern);
            if (match) {
              code = match[1];
              
              // Check if description contains an emphasized part
              const descParts = (match[2] || '').split(' - ');
              if (descParts.length > 1 && descParts[0].startsWith('*') && descParts[0].endsWith('*')) {
                reason = descParts[0].replace(/^\*|\*$/g, '');
                description = descParts.slice(1).join(' - ');
              } else {
                description = match[2] || '';
              }
            }
          } else if (line.includes('**') && line.includes('**')) {
            // Simple fallback matcher for any line with a bold number
            const basicMatch = line.match(/\*\*(\d+)\*\*/);
            if (basicMatch) {
              code = basicMatch[1];
              description = line.replace(/\*\*\d+\*\*:?\s*/, '');
            }
          }
          
          if (code) {
            console.log(`Found code: ${code}, reason: ${reason}, desc: ${description || ''}`);
            apiCodes.push({
              code,
              reason: reason || '',
              description: (description || '').trim()
            });
          }
        }
        
        // Log the captured codes
        console.log(`Total API codes captured: ${apiCodes.length}`);
        console.log("Captured codes:", apiCodes.map(c => c.code).join(', '));
        
        // Known API codes that should be included
        const knownCodes = ['20001', '20002', '20003', '20004', '20005', '20006', '20009', '20012', '20013', '20014', '20046'];
        
        // Check if any known codes are missing
        const missingCodes = knownCodes.filter(code => !apiCodes.some(item => item.code === code));
        if (missingCodes.length > 0) {
          console.log("Missing codes detected:", missingCodes.join(', '));
          
          // Add missing codes with generic descriptions
          missingCodes.forEach(code => {
            apiCodes.push({
              code,
              reason: '',
              description: 'See documentation for details'
            });
          });
          
          // Sort the codes numerically
          apiCodes.sort((a, b) => parseInt(a.code) - parseInt(b.code));
        }
        
        // If we found codes, generate custom HTML
        if (apiCodes.length > 0) {
          let html = '<div class="api-response-section">';
          html += '<h3>API Response Codes for Soft Declines</h3>';
          html += '<ul class="api-codes-list">';
          
          apiCodes.forEach(item => {
            html += '<li class="api-code-item">';
            html += `<span class="api-code"><strong>${item.code}</strong></span>`;
            
            if (item.reason) {
              html += ` - <span class="api-reason"><em>${item.reason}</em></span>`;
            }
            
            if (item.description) {
              html += `: <span class="api-description">${item.description}</span>`;
            }
            
            html += '</li>';
          });
          
          html += '</ul></div>';
          return html;
        }
      } catch (e) {
        console.error('Error in custom API code formatter:', e);
        // Fall back to default formatting if the custom handler fails
      }
    }
    
    // Special handling for SDK response patterns
    if (content.includes("SDKs for mobile applications") || content.includes("Checkout.com supports the following SDKs")) {
      // First process all bold texts
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Process the entire SDK list structure
      // 1. Format the SDK category headers (1. **Category**:)
      content = content.replace(/(\d+)\.\s+(?:\*\*([^:]*?)\*\*|<strong>([^:]*?)<\/strong>):\s*/gm, (match, number, category1, category2) => {
        const category = category1 || category2;
        return `<h3 class="sdk-category"><span class="number-marker">${number}.</span> <strong>${category}</strong>:</h3>`;
      });
      
      // 2. Format the individual SDK items (- **SDK Name**: Description)
      content = content.replace(/^\s*-\s+(?:\*\*([^:]*?)\*\*|<strong>([^:]*?)<\/strong>):\s*(.*?)$/gm, (match, sdk1, sdk2, description) => {
        const sdk = sdk1 || sdk2;
        return `<div class="sdk-item"><strong>${sdk}</strong>: ${description}</div>`;
      });
      
      // 3. Format the concluding paragraph
      const paragraphs = content.split('\n\n');
      if (paragraphs.length > 1) {
        const lastParagraph = paragraphs[paragraphs.length - 1];
        if (!lastParagraph.startsWith('<') && !lastParagraph.includes('**') && !lastParagraph.includes('<strong>')) {
          paragraphs[paragraphs.length - 1] = `<p class="sdk-conclusion">${lastParagraph}</p>`;
          content = paragraphs.join('\n\n');
        }
      }
      
      return content;
    }
    
    // Handle code blocks with triple backticks - enhanced with language labels
    const codeBlockRegex = /```(json|javascript|typescript|html|css|jsx|tsx|bash|python|java|csharp|php|ruby|go|rust|swift|kotlin)?\n([\s\S]*?)```/g;
    let formattedContent = content.replace(codeBlockRegex, (match, language, code) => {
      const displayLanguage = language ? language : 'code';
      
      if (language === 'json') {
        // Enhanced syntax highlighting for JSON
        const highlightedJson = code
          .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:') // keys
          .replace(/: "([^"]+)"/g, ': <span class="string">"$1"</span>') // string values
          .replace(/: (true|false|null)/g, ': <span class="boolean">$1</span>') // booleans and null
          .replace(/: (\d+(?:\.\d+)?)/g, ': <span class="number">$1</span>'); // numbers (including decimals)
        
        return `<pre><code class="json">${highlightedJson.trim()}</code></pre>`;
      }
      
      return `<pre data-language="${displayLanguage}"><code class="${language || ''}">${code.trim()}</code></pre>`;
    });

    // Format inline code with single backticks
    formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Format bold texts
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format italic text
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Format headers with improved class names
    formattedContent = formattedContent.replace(/^### (.*?)(?:\n|$)/gm, '<h3 class="message-h3">$1</h3>');
    formattedContent = formattedContent.replace(/^## (.*?)(?:\n|$)/gm, '<h2 class="message-h2">$1</h2>');
    formattedContent = formattedContent.replace(/^# (.*?)(?:\n|$)/gm, '<h1 class="message-h1">$1</h1>');
    
    // Format blockquotes
    formattedContent = formattedContent.replace(/^> (.*?)(?:\n|$)/gm, '<blockquote>$1</blockquote>');
    
    // Process structured numbered lists with nested content first
    // This regex matches patterns like "1. SDKs:"
    const structuredListRegex = /^(\d+)\.\s+([^:]+)\s*:\s*(.*?)$/gm;
    
    if (formattedContent.match(structuredListRegex)) {
      // First, identify the structured list items
      const listItems = formattedContent.match(structuredListRegex);
      
      // Process each structured list item and its nested content
      if (listItems) {
        for (const item of listItems) {
          const [, number, label, description] = item.match(/^(\d+)\.\s+([^:]+)\s*:\s*(.*?)$/m) || [];
          
          if (number && label) {
            // Create a placeholder for this item
            const placeholder = `__STRUCTURED_ITEM_${number}__`;
            
            // Find the content after this item until the next numbered item or end
            const itemRegex = new RegExp(`${item}([\\s\\S]*?)(?=^\\d+\\.|$)`, 'm');
            const match = formattedContent.match(itemRegex);
            
            if (match && match[1]) {
              // Process nested list with dashes
              let nestedContent = match[1].trim();
              if (nestedContent) {
                // First, preserve any markdown bold formatting
                nestedContent = nestedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                // Format dash items as nested list items, preserving descriptions
                nestedContent = nestedContent.replace(/^\s*-\s+(.*?)$/gm, (match, dashContent) => {
                  // Handle the pattern where there's a colon after the SDK name
                  // This could be like "**SDK Name**: Description" or "SDK Name: Description"
                  if (dashContent.includes(':')) {
                    // If we still have "**" (which shouldn't happen at this point, but just in case)
                    dashContent = dashContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    
                    // Check if we have an HTML strong tag
                    if (dashContent.includes('<strong>')) {
                      // Just return as is, preserving the strong tag and description
                      return `<li class="nested-item">${dashContent}</li>`;
                    } else {
                      // Try to split on colon and format
                      const colonIndex = dashContent.indexOf(':');
                      const sdk = dashContent.substring(0, colonIndex).trim();
                      const description = dashContent.substring(colonIndex + 1).trim();
                      return `<li class="nested-item"><strong>${sdk}</strong>: ${description}</li>`;
                    }
                  } else {
                    return `<li class="nested-item">${dashContent}</li>`;
                  }
                });
                
                nestedContent = `<ul class="nested-list">${nestedContent}</ul>`;
              }
              
              // Create the structured item HTML
              const structuredItemHtml = 
                `<li class="structured-item">
                  <div class="item-content">
                    <span class="number-marker">${number}.</span>
                    <span class="item-label">${label}</span>
                    <span class="item-separator">:</span>
                    <span class="item-description">${description}</span>
                  </div>
                  ${nestedContent}
                </li>`;
              
              // Replace the entire content (item + nested content) with the placeholder
              formattedContent = formattedContent.replace(itemRegex, placeholder);
              
              // Store the structured item HTML for later replacement
              formattedContent = formattedContent.replace(placeholder, structuredItemHtml);
            }
          }
        }
        
        // Wrap all structured items in an ordered list
        formattedContent = formattedContent.replace(/(<li class="structured-item">[\s\S]*?<\/li>)+/g, match => {
          return `<ol class="structured-list">${match}</ol>`;
        });
      }
    } 
    // Standard unordered lists (dash items) - more robust pattern
    const unorderedListRegex = /^\s*-\s+(.*?)$/gm;
    if (formattedContent.match(unorderedListRegex)) {
      // First, mark all list items to preserve them
      formattedContent = formattedContent.replace(unorderedListRegex, '___LIST_ITEM___$1___END_LIST_ITEM___\n');
      
      // Replace all list items with proper HTML
      formattedContent = formattedContent.replace(/___LIST_ITEM___(.*?)___END_LIST_ITEM___/g, '<li>$1</li>');
      
      // Wrap consecutive list items in a ul tag
      formattedContent = formattedContent.replace(/(<li>.*?<\/li>\s*)+/g, match => {
        return `<ul class="api-list">${match}</ul>`;
      });
    }
    
    // Standard numbered lists for other cases
    // This more flexible pattern handles various numbering formats and markdown styles
    const numberedListRegex = /^(\s*)(\d+)\.(?:\s+)(?:(?:\*\*)?(\d+)(?:\*\*)?)?(?:\s*[-–—]\s*)?(?:\*([^*\n]+)\*)?(?:\s*[:\.]\s*)?(.*)$/gm;
    if (formattedContent.match(numberedListRegex)) {
      formattedContent = formattedContent.replace(numberedListRegex, (match, indent, listNum, codeNum, emphasis, rest) => {
        let result = `<li class="numbered-item"><span class="number-marker">${listNum}.</span> `;
        
        if (codeNum) {
          result += `<strong>${codeNum}</strong>`;
          if (emphasis || rest) result += ' - ';
        }
        
        if (emphasis) {
          result += `<em>${emphasis}</em>`;
          if (rest) result += ': ';
        }
        
        if (rest) result += rest;
        
        result += '</li>';
        return result;
      });
      
      formattedContent = formattedContent.replace(/(<li class="numbered-item">.*?<\/li>\n?)+/g, match => {
        return `<ol class="custom-numbered-list">${match}</ol>`;
      });
    }

    // Format tables if present (simple markdown tables)
    const tableRegex = /^\|(.+)\|$/gm;
    if (formattedContent.match(tableRegex)) {
      // Find table headers
      formattedContent = formattedContent.replace(/^\|(.*)\|[\s]*\n\|([-|:]+)\|[\s]*\n/gm, (match, headers, separators) => {
        const headerCells = headers.split('|').map((cell: string) => cell.trim());
        let tableHTML = '<table><thead><tr>';
        
        headerCells.forEach((cell: string) => {
          tableHTML += `<th>${cell}</th>`;
        });
        
        tableHTML += '</tr></thead><tbody>';
        return tableHTML;
      });
      
      // Process table rows
      formattedContent = formattedContent.replace(/^\|(.*)\|$/gm, (match, row) => {
        if (row.includes('---')) return ''; // Skip separator row
        
        const cells = row.split('|').map((cell: string) => cell.trim());
        let rowHTML = '<tr>';
        
        cells.forEach((cell: string) => {
          rowHTML += `<td>${cell}</td>`;
        });
        
        rowHTML += '</tr>';
        return rowHTML;
      });
      
      // Close table tags
      formattedContent = formattedContent.replace(/<tbody>([^<]*)<\/tr>/g, '<tbody>$1</tr></tbody></table>');
    }

    // Format paragraphs (preserving existing HTML)
    const paragraphs = formattedContent.split('\n\n');
    formattedContent = paragraphs
      .map(p => {
        const trimmed = p.trim();
        if (
          !trimmed.startsWith('<') || 
          (trimmed.startsWith('<') && !trimmed.endsWith('>'))
        ) {
          return `<p>${trimmed}</p>`;
        }
        return trimmed;
      })
      .join('');
      
    // Clean up any remaining single newlines (not in code blocks)
    formattedContent = formattedContent.replace(/([^>])\n([^<])/g, '$1 $2');

    return formattedContent;
  };

  // Custom renderer for message content
  const renderMessageContent = (message: Message) => {
    if (message.isError) {
      return (
        <ErrorDisplay 
          message={message.content} 
          onRetry={handleRetry} 
        />
      );
    }
    
    // MODIFIED CODE START: Process raw API response before checking cache
    // Check if we have raw API data and extract the full output_text
    if (message.rawApiResponse && message.rawApiResponse.fullResponse) {
      // Add debugging to understand the structure of the raw API response
      console.log("Raw API response structure:", JSON.stringify({
        hasOutputText: !!message.rawApiResponse.fullResponse.output_text,
        hasOutput: !!message.rawApiResponse.fullResponse.output,
        outputIsArray: Array.isArray(message.rawApiResponse.fullResponse.output),
        outputLength: Array.isArray(message.rawApiResponse.fullResponse.output) ? message.rawApiResponse.fullResponse.output.length : 0,
        hasOutputContent: Array.isArray(message.rawApiResponse.fullResponse.output) && 
                         message.rawApiResponse.fullResponse.output.length > 0 && 
                         !!message.rawApiResponse.fullResponse.output[1]?.content,
        hasNestedOutputText: Array.isArray(message.rawApiResponse.fullResponse.output) && 
                      message.rawApiResponse.fullResponse.output.length > 0 && 
                      !!message.rawApiResponse.fullResponse.output[1]?.content?.[0]?.text
      }));
      
      // Log the full structure of the response for debugging
      try {
        console.log("Full response structure keys:", Object.keys(message.rawApiResponse.fullResponse));
        
        if (message.rawApiResponse.fullResponse.output) {
          console.log("Output array structure:", 
            Array.isArray(message.rawApiResponse.fullResponse.output) 
              ? message.rawApiResponse.fullResponse.output.map((item: any) => ({
                  type: item.type,
                  hasContent: !!item.content,
                  contentLength: item.content ? item.content.length : 0
                }))
              : "Not an array"
          );
        }
      } catch (e) {
        console.error("Error logging response structure:", e);
      }
      
      // Check for output_text in different possible locations
      let outputText = null;
      
      // First check direct output_text property
      if (message.rawApiResponse.fullResponse.output_text) {
        outputText = message.rawApiResponse.fullResponse.output_text;
        console.log("Found output_text in fullResponse.output_text");
      } 
      // Then check in the output array for message type with content
      else if (Array.isArray(message.rawApiResponse.fullResponse.output)) {
        // Look for message type outputs
        const messageOutput = message.rawApiResponse.fullResponse.output.find(
          (item: any) => item.type === 'message'
        );
        
        if (messageOutput && Array.isArray(messageOutput.content) && messageOutput.content.length > 0) {
          // Find the first content item with output_text
          const textContent = messageOutput.content.find(
            (item: any) => item.type === 'output_text' && item.text
          );
          
          if (textContent && textContent.text) {
            outputText = textContent.text;
            console.log("Found output_text in fullResponse.output[].content[].text");
          }
        }
      }
      
      // Finally, check if there's a direct text property
      if (!outputText && message.rawApiResponse.fullResponse.text) {
        outputText = message.rawApiResponse.fullResponse.text;
        console.log("Found output_text in fullResponse.text");
      }
      
      // Check in metadata
      if (!outputText && message.rawApiResponse.metadata && message.rawApiResponse.metadata.output_text) {
        outputText = message.rawApiResponse.metadata.output_text;
        console.log("Found output_text in metadata.output_text");
      }
      
      if (outputText) {
        console.log("Using raw API response output_text");
        console.log("Standard content length:", message.content.length);
        console.log("Raw API output_text length:", outputText.length);
        
        // Update the message content with the full output_text
        message = {
          ...message,
          content: outputText
        };
      } else {
        console.log("No output_text found in raw API response");
      }
    }
    // MODIFIED CODE END
    
    // Check cache after potentially updating the content
    const messageKey = `${message.id}-${message.content.length}`;
    if (formattedContentCache.current.has(messageKey)) {
      console.log(`Using cached formatted content for message ${message.id}`);
      const cachedContent = formattedContentCache.current.get(messageKey) || '';
      
      return (
        <div>
          <div dangerouslySetInnerHTML={{ __html: cachedContent }} />
          
          {message.role === 'assistant' && (
            <div className="documentation-link">
              <a href="https://www.checkout.com/docs" target="_blank" rel="noopener noreferrer">View Official Documentation →</a>
            </div>
          )}
          
          {message.hasVectorStoreError && (
            <div className="vector-store-error">
              <div className="error-badge">Knowledge Base Error</div>
              <p>The information you requested could not be found in our knowledge base. I've provided a general answer instead.</p>
            </div>
          )}
        </div>
      );
    }
    
    // Debug logging for message content length
    console.log(`Message content length before formatting: ${message.content.length}`);
    console.log(`First 100 chars: ${message.content.substring(0, 100)}`);
    console.log(`Last 100 chars: ${message.content.substring(message.content.length - 100)}`);
    
    // Format the content
    const formattedContent = formatMessageContent(message.content);
    console.log(`Formatted content length: ${formattedContent.length}`);
    
    // Check if this is an API response codes message - if the formatted content is suspiciously short, don't use it
    if (message.content.includes("API response codes for") && 
       (message.content.includes("soft declines") || message.content.includes("hard declines"))) {
      
      // Try displaying the raw content directly without formatting
      console.log("Using raw content display for API codes");
      console.log("Raw content:", message.content);
      
      // Get the known codes that should be included
      const knownCodes = ['20001', '20002', '20003', '20004', '20005', '20006', '20009', '20012', '20013', '20014', '20046', '20051', '20059'];
      
      // Parse the existing codes from the raw content
      const existingCodes = (message.content.match(/\*\*(\d+)\*\*/g) || [])
                              .map(code => code.replace(/\*\*/g, ''));
      console.log("Existing codes in raw content:", existingCodes);
      
      // Find missing codes
      const missingCodes = knownCodes.filter(code => !existingCodes.includes(code));
      console.log("Missing codes to add:", missingCodes);
      
      // Create enhanced content that includes the missing codes
      let enhancedContent = message.content;
      
      // Add missing codes before the last paragraph
      if (missingCodes.length > 0) {
        const contentParts = enhancedContent.split('\n\n');
        const lastParagraph = contentParts.pop() || '';
        
        // Add a section for missing codes
        let missingCodesSection = '\n### Additional API Response Codes\n\n';
        missingCodes.forEach(code => {
          missingCodesSection += `- **${code}**: See documentation for additional details.\n`;
        });
        
        // Reassemble content with missing codes
        contentParts.push(missingCodesSection);
        contentParts.push(lastParagraph);
        enhancedContent = contentParts.join('\n\n');
        
        console.log("Enhanced content with missing codes:", enhancedContent);
      }
      
      // Escape HTML characters in the enhanced content
      const escapedContent = enhancedContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      
      // Basic markdown formatting for raw content
      const basicFormatting = escapedContent
        // Replace newlines with <br> tags to preserve line breaks
        .replace(/\n/g, '<br>')
        // Format headers
        .replace(/###\s+(.*?)(?:<br>|$)/g, '<h3>$1</h3>')
        // Format bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Format italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Format bullet points (after replacing newlines)
        .replace(/<br>\s*-\s+(.*?)(?=<br>|$)/g, '<li>$1</li>')
        // Wrap consecutive list items in ul
        .replace(/(<li>.*?<\/li>)+/g, '<ul class="api-list">$&</ul>')
        // Format code items - common pattern in response codes
        .replace(/<strong>(\d+)<\/strong>/g, '<span class="api-code"><strong>$1</strong></span>');
      
      // Create a simple container with a divider between original and additional codes if needed
      const rawDisplayContent = `
        <div class="api-response-section raw-content">
          <h3>API Response Codes</h3>
          <div class="api-raw-content">
            ${basicFormatting}
          </div>
        </div>
      `;
      
      // Store in cache
      formattedContentCache.current.set(messageKey, rawDisplayContent);
      console.log("Raw display content length:", rawDisplayContent.length);
      console.log("Enhanced content included missing codes:", missingCodes.length > 0 ? "Yes" : "No");
      
      return (
        <div>
          <div dangerouslySetInnerHTML={{ __html: rawDisplayContent }} />
          
          {message.role === 'assistant' && (
            <div className="documentation-link">
              <a href="https://www.checkout.com/docs" target="_blank" rel="noopener noreferrer">View Official Documentation →</a>
            </div>
          )}
          
          {message.hasVectorStoreError && (
            <div className="vector-store-error">
              <div className="error-badge">Knowledge Base Error</div>
              <p>The information you requested could not be found in our knowledge base. I've provided a general answer instead.</p>
            </div>
          )}
        </div>
      );
    }
    
    // Store in cache to prevent multiple formatting passes
    formattedContentCache.current.set(messageKey, formattedContent);
    
    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
        
        {message.role === 'assistant' && (
          <div className="documentation-link">
            <a href="https://www.checkout.com/docs" target="_blank" rel="noopener noreferrer">View Official Documentation →</a>
          </div>
        )}
        
        {message.hasVectorStoreError && (
          <div className="vector-store-error">
            <div className="error-badge">Knowledge Base Error</div>
            <p>The information you requested could not be found in our knowledge base. I've provided a general answer instead.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <Header />
      
      <ChatMessages 
        messages={messages} 
        isLoading={isLoading} 
        messagesEndRef={messagesEndRef}
        renderMessageContent={renderMessageContent}
      />
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading} 
      />
      
      <style jsx global>{`
        /* API response section styling */
        .api-response-section {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          border: 1px solid #e9ecef;
        }
        
        /* Raw content styling */
        .raw-content {
          background-color: #fafafa;
        }
        
        .api-raw-content {
          white-space: pre-wrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
        }
        
        .api-raw-content h3 {
          margin-top: 16px;
          margin-bottom: 10px;
          font-size: 18px;
          font-weight: 600;
        }
        
        .api-raw-content ul {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        
        .api-raw-content li {
          margin-bottom: 10px;
          position: relative;
        }
        
        .api-response-section h3 {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 18px;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 8px;
        }
        
        .api-codes-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }
        
        .api-code-item {
          padding: 8px 0;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          margin-bottom: 8px;
          position: relative;
          padding-left: 20px;
        }
        
        .api-code-item:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #555;
        }
        
        .api-code {
          font-weight: 600;
        }
        
        .api-reason {
          font-style: italic;
          color: #555;
        }
        
        .api-description {
          display: inline-block;
        }
        
        /* Vector store error styling */
        .vector-store-error {
          margin-top: 10px;
          padding: 8px 12px;
          background-color: #fff8e6;
          border-left: 3px solid #ffc107;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        
        /* API list styling */
        .api-list {
          list-style-type: none;
          padding-left: 0;
          margin: 12px 0;
        }
        
        .api-list li {
          margin-bottom: 12px;
          padding-left: 20px;
          position: relative;
        }
        
        .api-list li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #555;
        }
        
        /* Error badge styling */
        .error-badge {
          display: inline-block;
          padding: 2px 6px;
          background-color: #ffc107;
          color: #333;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.75rem;
          margin-bottom: 5px;
        }
        
        .vector-store-error p {
          margin: 0;
          color: #664d03;
        }

        /* Additional API codes section styling */
        .api-raw-content h3:not(:first-child) {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px dashed #ddd;
        }
        
        .api-raw-content strong {
          font-weight: 600;
        }
        
        /* Ensure API code spans stand out */
        .api-code {
          display: inline-block;
          min-width: 60px;
        }

        /* Nested list styling */
        .structured-item {
          margin-bottom: 16px;
        }

        .nested-list {
          margin-top: 8px;
          margin-left: 24px;
          list-style-type: none;
          padding-left: 0;
        }

        .nested-item {
          margin: 8px 0;
          line-height: 1.5;
          padding-right: 8px;
          text-align: left;
        }

        .nested-item strong {
          font-weight: 600;
        }

        .item-content {
          margin-bottom: 4px;
          font-weight: 500;
        }

        .structured-list {
          list-style-type: none;
          padding-left: 0;
        }

        /* Ensure paragraphs have proper spacing */
        p {
          margin: 8px 0;
        }

        /* SDK specific styling */
        .sdk-category {
          font-size: 18px;
          margin-top: 16px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .sdk-item {
          margin: 8px 0 8px 24px;
          line-height: 1.5;
        }

        .sdk-conclusion {
          margin-top: 16px;
          font-style: italic;
          color: #505050;
        }

        /* Documentation link styling */
        .documentation-link {
          margin-top: 12px;
          margin-bottom: 10px;
          text-align: right;
        }

        .documentation-link a {
          display: inline-block;
          padding: 6px 12px;
          background-color: #f5f7fa;
          border: 1px solid #e0e5eb;
          border-radius: 4px;
          color: #3c4257;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .documentation-link a:hover {
          background-color: #e9ecf1;
          border-color: #d0d5dd;
          color: #0a2540;
        }
      `}</style>
    </div>
  );
}