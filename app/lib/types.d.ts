// Extend the OpenAI API types for Vector Stores
declare module 'openai' {
  interface OpenAI {
    vectorStores: {
      create(params: { name: string }): Promise<any>;
      get(params: { name: string }): Promise<any>;
      query(params: { 
        vectorStore: string;
        query: string;
        topK?: number;
        includeMetadata?: boolean;
      }): Promise<{
        matches: Array<{
          id: string;
          score: number;
          metadata?: {
            content?: string;
            source?: string;
            [key: string]: any;
          };
        }>;
      }>;
      batchAddItems(params: {
        vectorStore: string;
        items: Array<{
          id: string;
          text: string;
          metadata?: {
            [key: string]: any;
          };
        }>;
      }): Promise<any>;
    };
  }
}

declare module 'agents' {
  export class Agent {
    constructor(options: {
      name: string;
      instructions: string;
      tools?: Array<{
        name: string;
        description: string;
        parameters: {
          type: string;
          properties: {
            [key: string]: {
              type: string;
              description: string;
            };
          };
          required: string[];
        };
        handler: (...args: any[]) => any;
      }>;
    });
  }

  export class Runner {
    run(options: {
      agent: Agent;
      input: string;
    }): Promise<{
      final_output: string;
      [key: string]: any;
    }>;
  }
} 