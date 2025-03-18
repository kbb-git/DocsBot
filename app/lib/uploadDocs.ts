import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import OpenAI properly
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Use provided vector store info
const VECTOR_STORE_NAME = process.env.VECTOR_STORE_NAME || 'ckodocs';
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || 'vs_67d17cedee54819198e647fc9392a0c6';
const FILE_ID = process.env.FILE_ID || 'file-Vk8ao5oKko58kyBLXEQjYH';

// Define types for summary data
interface DocumentFile {
  filename: string;
  title: string;
  chunkCount: number;
  firstChunk: string;
  sampleChunks: string[];
}

interface SummaryData {
  files: DocumentFile[];
  totalChunks: number;
  processedAt: string;
}

interface EmbeddingData {
  embedding: number[];
  index: number;
  object: string;
}

/**
 * Uploads Checkout.com documentation to the OpenAI vector store
 */
async function uploadDocs() {
  console.log('Starting document upload process...');
  
  // Check if documents directory exists
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    console.error('Error: docs directory not found. Please create a docs directory and add your documentation files.');
    process.exit(1);
  }
  
  // Get all files from the docs directory
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md') || file.endsWith('.txt'));
  
  if (files.length === 0) {
    console.error('Error: No markdown or text files found in the docs directory.');
    process.exit(1);
  }
  
  console.log(`Found ${files.length} documentation files.`);
  console.log(`Using Vector Store: ${VECTOR_STORE_NAME} (ID: ${VECTOR_STORE_ID})`);
  console.log(`Using File ID: ${FILE_ID}`);
  
  // Text splitter for chunking documents - reduce chunk size for better results and lower token usage
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 5000,  // Changed from 1000 to 5000
    chunkOverlap: 200, // Changed from 100 to 200
  });
  
  let totalChunks = 0;
  
  // Create a summary file that we can use for reference
  const summaryPath = path.join(process.cwd(), 'docs', 'summary.json');
  let summaryData: SummaryData = {
    files: [],
    totalChunks: 0,
    processedAt: new Date().toISOString()
  };
  
  // Process each file
  for (const file of files) {
    // Skip .gitkeep file and our own summary file
    if (file === '.gitkeep' || file === 'summary.json') continue;
    
    console.log(`Processing ${file}...`);
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title and section information where possible
    const fileTitle = path.basename(file, path.extname(file)).replace(/[-_]/g, ' ');
    const headingMatch = content.match(/^# (.+)$/m);
    const title = headingMatch ? headingMatch[1] : fileTitle;
    
    // Split text into chunks
    const chunks = await textSplitter.splitText(content);
    console.log(`Split into ${chunks.length} chunks.`);
    
    // Process chunks in batches to generate embeddings and upload
    const batchSize = 20; // Smaller batch size to avoid rate limits
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      
      try {
        // Create embeddings for the batch
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: batchChunks
        });
        
        // Prepare items for the vector store
        const vectors = embeddingResponse.data.map((item: EmbeddingData, index: number) => {
          const chunkIndex = i + index;
          // Extract section title if available (look for markdown headings)
          const sectionMatch = batchChunks[index].match(/^#+\s+(.+)$/m);
          const section = sectionMatch ? sectionMatch[1] : '';
          
          return {
            id: `${file.replace(/\.[^/.]+$/, '')}_${chunkIndex}`,
            values: item.embedding,
            metadata: {
              content: batchChunks[index],
              source: file,
              title: title,
              section: section,
              chunkIndex: chunkIndex,
              file_id: FILE_ID // Associate with the specific file ID
            }
          };
        });
        
        // Upload vectors to the OpenAI vector store using direct API call
        const uploadResponse = await fetch(`https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/vectors/upsert`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Organization': process.env.OPENAI_ORG_ID || ''
          },
          body: JSON.stringify({
            vectors: vectors,
            file_id: FILE_ID // Specify the file ID to associate with these vectors
          })
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`API error: ${uploadResponse.status} - ${JSON.stringify(errorData)}`);
        }
        
        console.log(`Uploaded vectors ${i} to ${Math.min(i + batchSize, chunks.length)} for ${file}`);
        
        // Add a small delay between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing batch ${i} to ${i + batchSize} for ${file}:`, error);
      }
    }
    
    // Add to summary data
    const fileInfo: DocumentFile = {
      filename: file,
      title: title,
      chunkCount: chunks.length,
      firstChunk: chunks[0],
      sampleChunks: chunks.length > 5 ? [chunks[0], chunks[Math.floor(chunks.length/2)], chunks[chunks.length-1]] : chunks
    };
    
    summaryData.files.push(fileInfo);
    totalChunks += chunks.length;
  }
  
  // Update summary data
  summaryData.totalChunks = totalChunks;
  
  // Write the summary to file
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  
  console.log(`Upload complete! Uploaded a total of ${totalChunks} chunks to OpenAI Vector Store.`);
  console.log(`Used file ID: ${FILE_ID} for better organization.`);
  console.log(`Summary information saved to ${summaryPath}`);
}

// Run the process if this file is executed directly
if (require.main === module) {
  uploadDocs().catch(console.error);
}

export { uploadDocs }; 