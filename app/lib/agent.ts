// Import OpenAI properly
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Use the provided vector store info
const VECTOR_STORE_NAME = process.env.VECTOR_STORE_NAME || 'ckodocs';
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || 'vs_67d17cedee54819198e647fc9392a0c6';
const FILE_ID = process.env.FILE_ID || 'file-Vk8ao5oKko58kyBLXEQjYH';

// Define type for vector store item
interface VectorStoreItem {
  id?: string;
  metadata?: {
    content?: string;
    source?: string;
    [key: string]: any;
  };
  score?: number;
}

// Define type for search results
interface SearchResult {
  content: string;
  source: string;
  score: number;
}

// Define type for documentation search response
interface DocumentationSearchResponse {
  results: SearchResult[];
  error?: {
    type: string;
    message: string;
  };
}

// Define types for OpenAI responses API
interface FileCitation {
  text?: string;
  file_id?: string;
  file_path?: string;
  file_name?: string;
  [key: string]: any;
}

interface ToolResponse {
  type: string;
  file_citations?: FileCitation[];
  [key: string]: any;
}

/**
 * Run the Checkout Docs agent to answer questions based on documentation
 */
export async function runCheckoutDocsAgent(input: string) {
  try {
    // Search OpenAI vector store
    const docSearchResponse = await searchDocumentation(input);
    
    // Prepare context from vector search results
    let context = '';
    let vectorSearchError = '';
    
    if (docSearchResponse.error) {
      vectorSearchError = `Note: ${docSearchResponse.error.message}`;
      console.warn(`Vector search error: ${docSearchResponse.error.type} - ${docSearchResponse.error.message}`);
    }
    
    if (Array.isArray(docSearchResponse.results) && docSearchResponse.results.length > 0) {
      // Only use the top 3 most relevant results to reduce token usage
      const topResults = docSearchResponse.results
        .slice(0, 3)
        .filter(result => result.score > 0.7) // Only use results above a relevance threshold
        .map((result) => {
          // Truncate long content to reduce tokens
          const content = result.content.length > 5000 
            ? result.content.substring(0, 5000) + "..." 
            : result.content;
          
          return `Content: ${content}\nSource: ${result.source}\n---\n`;
        })
        .join('\n');
      
      context = topResults || 'No highly relevant documentation found.';
    } else {
      context = 'No relevant documentation found.';
    }
    
    // Use OpenAI to generate a response based on the context
    // Switching from GPT-3.5 Turbo to GPT-4o mini for better quality while still controlling token usage
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that answers questions about Checkout.com documentation. Be concise.

When responding:
1. Base your answers on the documentation provided in the context.
2. If the answer is in the documentation, answer confidently.
3. If information is missing, acknowledge this and suggest contacting Checkout.com support.
4. Don't make up information beyond what's in the context.
5. Keep responses brief but helpful.
${vectorSearchError ? `6. ${vectorSearchError}` : ''}

Context from documentation:
${context}`
        },
        {
          role: "user",
          content: input
        }
      ],
      max_tokens: 2000 // Limit token usage
    });
    
    let responseText = response.choices[0].message.content;
    
    // If there was a vector search error, append a note to the response
    if (docSearchResponse.error && !responseText.includes(docSearchResponse.error.message)) {
      responseText += `\n\n(Note: ${docSearchResponse.error.message} I've provided an answer based on general knowledge instead.)`;
    }
    
    return {
      response: responseText,
      metadata: { 
        context: docSearchResponse.results,
        vectorSearchError: docSearchResponse.error
      },
      fullResponse: response // Include the full response object
    };
  } catch (error) {
    console.error("Error running agent:", error);
    return {
      response: "I'm sorry, I encountered an error while processing your request. Please try again.",
      error: error
    };
  }
}

/**
 * Search Checkout.com documentation
 */
async function searchDocumentation(query: string): Promise<DocumentationSearchResponse> {
  try {
    console.log("Searching documentation with query:", query);
    console.log("Using vector store ID:", VECTOR_STORE_ID);
    
    try {
      // Format exactly as shown in the example
      const requestPayload = {
        model: "gpt-4.1-mini",
        input: query,
        instructions: "You are a helpful assistant that searches Checkout.com documentation",
        tools: [
          {
            type: "file_search",
            vector_store_ids: [VECTOR_STORE_ID]
            // Filters are optional, so we're not including them
          }
        ]
      };
      
      console.log("Request payload for vector search:", JSON.stringify(requestPayload, null, 2));
      
      const response = await openai.responses.create(requestPayload);
      
      console.log("Response from vector search:", JSON.stringify(response, null, 2));
      
      // Define interfaces for the OpenAI response structure
      interface FileSearchOutput {
        type: string;
        file_citations?: FileCitation[];
        [key: string]: any;
      }
      
      // Process the response
      if (response.output && Array.isArray(response.output)) {
        // Look for message type outputs
        const messageOutputs = response.output.filter((item: any) => item.type === "message");
        
        for (const messageOutput of messageOutputs) {
          if (messageOutput.content && Array.isArray(messageOutput.content)) {
            for (const contentItem of messageOutput.content) {
              if (contentItem.annotations && Array.isArray(contentItem.annotations)) {
                const fileCitations = contentItem.annotations.filter(
                  (annotation: any) => annotation.type === "file_citation"
                );
                
                if (fileCitations && fileCitations.length > 0) {
                  console.log("File citations found in annotations:", fileCitations.length);
                  
                  // Combine file citations with their text from the output
                  const results: SearchResult[] = fileCitations.map((citation: any) => ({
                    content: contentItem.text || '',
                    source: citation.filename || citation.file_id || 'Checkout.com documentation',
                    score: 0.95 // Default score
                  }));
                  
                  return { results };
                }
              }
            }
          }
        }
      }
      
      // Legacy handling for the old format
      if (response.tool_use_outputs && response.tool_use_outputs.length > 0) {
        // Find the file search output
        const fileSearchOutput = response.tool_use_outputs.find(
          (output: FileSearchOutput) => output.type === 'file_search'
        );
        
        if (fileSearchOutput && fileSearchOutput.file_citations && fileSearchOutput.file_citations.length > 0) {
          console.log("File citations found in tool_use_outputs:", fileSearchOutput.file_citations.length);
          // Map file citations to search results
          const results: SearchResult[] = fileSearchOutput.file_citations.map((citation: FileCitation) => ({
            content: citation.text || '',
            source: citation.file_path || citation.file_name || citation.file_id || 'Checkout.com documentation',
            score: 0.95 // We don't have actual scores from the API, so use a high default
          }));
          
          return { results };
        } else {
          console.log("No file citations found in tool_use_outputs");
        }
      }
      
      if (response.output_text && response.output_text.trim() !== '') {
        // If there are no file citations but we have output text,
        // the model might have answered from its knowledge
        console.log("No file citations but received output text from the model");
        return {
          results: [{
            content: response.output_text,
            source: "Model knowledge - no document citations",
            score: 0.8
          }],
          error: {
            type: "NoDocumentMatches",
            message: "The search didn't find relevant documents in the knowledge base."
          }
        };
      }
      
      // No results found, fall back to general knowledge
      console.log("No results from file search, using fallback method");
      return {
        results: await fallbackSearchDocumentation(query),
        error: {
          type: "NoResultsError",
          message: "The information you requested could not be found in our knowledge base."
        }
      };
    } catch (error) {
      console.error("File search error:", error);
      
      // All vector search methods failed, fall back to general knowledge
      console.error("All vector search methods failed:", error);
      return {
        results: await fallbackSearchDocumentation(query),
        error: {
          type: "VectorSearchError",
          message: "The information you requested could not be found in our knowledge base."
        }
      };
    }
  } catch (error) {
    console.error("Error searching documentation:", error);
    return {
      results: await fallbackSearchDocumentation(query),
      error: {
        type: "DocumentationSearchError",
        message: "The information you requested could not be found in our knowledge base."
      }
    };
  }
}

/**
 * Fallback search method using chat completions
 */
async function fallbackSearchDocumentation(query: string): Promise<SearchResult[]> {
  try {
    // Use the chat completions API as a fallback
    const retrievalResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You're helping retrieve information about Checkout.com from their documentation. 
          The user is asking: "${query}".
          Please provide a concise answer based on what you know about Checkout.com's payment processing services, 
          APIs, and integration methods. Focus specifically on their documentation.`
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.2, // Lower temperature for more factual responses
      max_tokens: 2000 // Limit token usage
    });
    
    // Format the response to match our expected structure
    const content = retrievalResponse.choices[0].message.content || '';
    
    return [
      {
        content: content,
        source: "Checkout.com general knowledge (fallback)",
        score: 0.95 // Simulated high relevance score
      }
    ];
  } catch (error) {
    console.error("Error in fallback search:", error);
    return [
      {
        content: "I couldn't find specific information about that in the Checkout.com documentation.",
        source: "Fallback response",
        score: 0.5
      }
    ];
  }
} 