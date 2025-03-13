# Checkout.com Documentation

Place your Checkout.com documentation files in this directory before running the upload script.

## Supported File Formats

- Markdown (`.md`)
- Text files (`.txt`)

## How to Add Documentation

1. Add your documentation files to this directory
2. Run the upload script:
   ```
   npm run upload-docs
   ```

The upload script will:

1. Process all the files in this directory
2. Split them into chunks
3. Generate embeddings for each chunk
4. Store them in Pinecone for quick retrieval by the AI agent

## Tips for Better Results

- Use clear, structured documentation
- Break large documentation into separate files by topic
- Use descriptive filenames
- Include metadata at the top of each file (e.g., title, description) 