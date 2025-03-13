# Checkout Docs Helper

An AI Agent built with OpenAI Agents SDK that provides answers based on Checkout.com documentation.

## Features

- Chat interface to interact with the AI agent
- Vector search through Checkout.com documentation
- Accurate answers based on the documentation content
- Simple and modern UI
- Error handling with retry capability
- Responsive design for mobile and desktop

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.local` to your own `.env.local` file and fill in the required API key:
   - OpenAI API key (get from https://platform.openai.com/api-keys)
4. Place your Checkout.com documentation files in the `docs` directory (supports .md and .txt files)
   - See `docs/example.md` for a format reference
5. Upload your Checkout.com documentation to the vector store:
   ```
   npm run upload-docs
   ```
6. Start the development server:
   ```
   npm run dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Type your question about Checkout.com documentation in the chat interface
2. The AI agent will search through the documentation and provide relevant answers
3. Continue the conversation as needed
4. If you encounter an error, use the "Try Again" button to retry

## How It Works

1. **Documentation Ingestion**: When you run the upload script, your documentation is:
   - Split into smaller chunks
   - Converted to vector embeddings using OpenAI's embeddings model
   - Stored in OpenAI Vector Store for efficient retrieval

2. **User Interaction**: When you ask a question:
   - Your query is sent to the server
   - The OpenAI Agents SDK processes your query
   - The agent searches the vector store for relevant documentation
   - The agent formulates a response based on the documentation
   - The response is returned to the chat interface

## Technologies Used

- **Frontend**: Next.js and React for the web application
- **Backend**: Next.js API routes for server-side processing
- **AI**: OpenAI Agents SDK for the AI agent
- **Vector Database**: OpenAI Vector Stores for storing and searching documentation
- **Language**: TypeScript for type safety

## Development

### Project Structure

```
checkout-docs-helper/
├── app/                  # Next.js application
│   ├── api/              # API routes
│   ├── components/       # React components
│   ├── lib/              # Utility functions and agent implementation
│   ├── styles/           # CSS styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── docs/                 # Documentation files
├── scripts/              # Upload scripts
├── .env.local            # Environment variables
└── package.json          # Dependencies
```

### Customization

- **Agent Instructions**: Modify the agent instructions in `app/lib/agent.ts` to customize behavior
- **UI**: Update styles in `app/styles/globals.css`
- **Error Handling**: Customize error messages in `app/components/ErrorDisplay.tsx`

## Deployment

### Deploying to render.com

1. Push your code to a GitHub repository
2. Log in to [render.com](https://render.com)
3. Click "New" and select "Blueprint"
4. Connect your GitHub repository
5. render.com will automatically detect the `render.yaml` configuration
6. Set up the required environment variables in the render.com dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `VECTOR_STORE_NAME`: Your vector store name
   - `VECTOR_STORE_ID`: Your vector store ID
   - `FILE_ID`: Your file ID
7. Click "Apply" to deploy your application

### Environment Variables

This project uses environment variables for configuration. For local development:
1. Copy `.env.example` to `.env.local`
2. Fill in your actual values

For production deployment, set these variables in your hosting platform's environment settings.

## License

MIT 