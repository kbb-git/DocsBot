import { NextRequest, NextResponse } from 'next/server';
import { runCheckoutDocsAgent } from '../../lib/agent';

// Simple in-memory cache for responses
// In a production app, you might use Redis or another solution
const responseCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

// Define error interface for TypeScript
interface OpenAIError {
  code?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Get the message from the request body
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Generate a cache key from the message (simplified for demo)
    const cacheKey = message.trim().toLowerCase();
    
    // Check if we have a cached response
    if (responseCache.has(cacheKey)) {
      const cachedData = responseCache.get(cacheKey);
      // Check if cache is still valid
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        console.log('Using cached response');
        return NextResponse.json({ 
          response: cachedData.response,
          metadata: cachedData.metadata,
          cached: true,
          vectorStoreError: cachedData.vectorStoreError
        });
      } else {
        // Cache expired, remove it
        responseCache.delete(cacheKey);
      }
    }

    // Run the agent with the user's message
    const agentResponse = await runCheckoutDocsAgent(message);

    // Cache the response if successful
    if (agentResponse.response && !agentResponse.error) {
      responseCache.set(cacheKey, {
        ...agentResponse,
        timestamp: Date.now()
      });
    }

    // Return the response with vector store error info if present
    return NextResponse.json({ 
      response: agentResponse.response,
      metadata: agentResponse.metadata,
      vectorStoreError: agentResponse.metadata?.vectorSearchError || null,
      raw_api_response: {
        fullResponse: agentResponse.fullResponse,
        metadata: agentResponse.metadata
      }  // Add the raw API response for debugging
    });
  } catch (error: unknown) {
    console.error('Error processing chat request:', error);
    
    // Type guard for OpenAI errors
    const openAIError = error as OpenAIError;
    
    // Check for rate limit errors and handle them gracefully
    if (openAIError.code === 'rate_limit_exceeded') {
      return NextResponse.json(
        { 
          error: 'OpenAI rate limit exceeded',
          message: 'The service is experiencing high demand. Please try again in a moment.',
          response: "I'm sorry, but I'm currently handling too many requests. Please try asking a simpler question or try again in a few moments."
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        message: error instanceof Error ? error.message : 'Unknown error',
        response: "I'm sorry, I encountered an error while processing your request. The knowledge base might be temporarily unavailable."
      },
      { status: 500 }
    );
  }
} 