# Crucible Backend

Node.js/Express backend for the Crucible project that provides a REST API for multi-provider AI querying and synthesis.

## Overview

The backend integrates with the `crucible-core` library to provide:
- Multi-provider AI querying (OpenAI, DeepSeek)
- Response synthesis to reduce bias
- RESTful API endpoints
- Error handling and logging

## Architecture

The backend uses a clean architecture with:
- **crucible-core**: Core library for AI provider management and synthesis
- **Express.js**: Web framework for REST API
- **Environment-based configuration**: API keys and settings via `.env`

### Key Files

- `src/index.js` — Server startup and configuration
- `src/app.js` — Express app with API endpoints
- `package.json` — Dependencies including local crucible-core

## Setup

### Prerequisites

- Node.js (v16 or higher)
- API keys for AI providers

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory (not in backend/):
   ```bash
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # DeepSeek Configuration
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_API_URL=https://api.deepseek.com/v1
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   **Important**: Run `npm start` from the `backend/` directory, not the root directory.

   The server will start on `http://localhost:3000`

## API Endpoints

### `GET /providers`
Returns available AI providers.

**Response:**
```json
{
  "providers": ["openai", "deepseek"]
}
```

### `POST /test-openai`
Test the OpenAI provider with a single query.

**Request:**
```json
{
  "prompt": "What is the capital of France?"
}
```

**Response:**
```json
{
  "source": "OpenAI",
  "response": "The capital of France is Paris.",
  "model": "gpt-4-0613",
  "timestamp": "2025-06-29T20:16:47.745Z",
  "metadata": { ... }
}
```

### `POST /test-deepseek`
Test the DeepSeek provider with a single query.

**Request:**
```json
{
  "prompt": "What is the capital of France?"
}
```

**Response:**
```json
{
  "source": "DeepSeek",
  "response": "The capital of France is **Paris**.",
  "model": "deepseek-chat",
  "timestamp": "2025-06-29T20:16:50.838Z",
  "metadata": { ... }
}
```

### `POST /query`
Query multiple AI providers simultaneously.

**Request:**
```json
{
  "prompt": "What is the capital of France?"
}
```

**Response:**
```json
{
  "responses": [
    {
      "source": "OpenAI",
      "response": "The capital of France is Paris.",
      "model": "gpt-4-0613",
      "timestamp": "2025-06-29T20:16:47.745Z",
      "metadata": { ... }
    },
    {
      "source": "DeepSeek",
      "response": "The capital of France is **Paris**.",
      "model": "deepseek-chat",
      "timestamp": "2025-06-29T20:16:50.838Z",
      "metadata": { ... }
    }
  ],
  "failed": 0,
  "total": 2,
  "successful": 2
}
```

### `POST /query-and-synthesize`
Query multiple providers and synthesize their responses.

**Request:**
```json
{
  "prompt": "What is the capital of France?"
}
```

**Response:**
```json
{
  "synthesized": "The capital of France is Paris, a city renowned globally for its rich history, vibrant culture, and iconic landmarks...",
  "sources": [ ... ],
  "strategy": "combine",
  "provider": "OpenAI",
  "timestamp": "2025-06-29T20:17:06.050Z",
  "metadata": { ... },
  "queryResult": { ... }
}
```

## Example Usage

### Using curl

```bash
# Test individual providers
curl -X POST http://localhost:3000/test-openai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'

curl -X POST http://localhost:3000/test-deepseek \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'

# Query multiple providers
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'

# Query and synthesize
curl -X POST http://localhost:3000/query-and-synthesize \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'
```

### Using JavaScript

```javascript
// Test OpenAI
const openaiResponse = await fetch('http://localhost:3000/test-openai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'What is the capital of France?' })
});

// Query multiple providers
const multiResponse = await fetch('http://localhost:3000/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'What is the capital of France?' })
});

// Query and synthesize
const synthesisResponse = await fetch('http://localhost:3000/query-and-synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'What is the capital of France?' })
});
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `DEEPSEEK_API_URL`: DeepSeek API URL (default: https://api.deepseek.com/v1)
- `PORT`: Server port (default: 3000)

### Synthesis Configuration

The backend uses the synthesis configuration from the root directory (`crucible-synthesis-config.json`). See the main README for configuration details.

## Development

### Running in Development

```bash
# Start with nodemon for auto-restart
npm run dev

# Or start directly
node src/index.js
```

### Project Structure

```
backend/
├── src/
│   ├── index.js          # Server startup
│   ├── app.js            # Express app and routes
│   └── lambda.js         # AWS Lambda handler
├── package.json          # Dependencies
└── README.md            # This file
```

### Dependencies

- **crucible-core**: Local dependency for AI provider management
- **express**: Web framework
- **dotenv**: Environment variable loading
- **cors**: Cross-origin resource sharing

## Troubleshooting

### Common Issues

1. **"Missing Authentication Token"**: Make sure you're running the server from the `backend/` directory
2. **API key errors**: Verify your `.env` file is in the root directory and contains valid API keys
3. **Port already in use**: Change the port in your `.env` file or kill the existing process

### Logs

The server logs important information including:
- Provider initialization
- API requests and responses
- Synthesis configuration loading
- Error details

## Integration with crucible-core

The backend integrates crucible-core as a local dependency, providing a clean separation between:
- **API Layer**: Express routes and request handling
- **Core Logic**: Multi-provider queries and synthesis via crucible-core

This architecture allows the core library to be used independently while the backend provides a RESTful interface. 