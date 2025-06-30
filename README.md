# Crucible

A multisource knowledge tool that queries multiple AI models from different regions and synthesizes their responses to reduce single-source bias.

## Overview

Crucible is designed to provide more balanced and comprehensive AI responses by:
- Querying multiple AI providers simultaneously (OpenAI, DeepSeek, etc.)
- Synthesizing responses to reduce bias and improve accuracy
- Providing a unified API for multi-provider AI interactions

## Project Structure

- `backend/` — Node.js/Express backend with REST API
- `crucible-core/` — Core library for multi-provider AI querying and synthesis
- `crucible-synthesis-config.json` — Configuration for synthesis prompts (must be in root directory)

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- API keys for AI providers (OpenAI, DeepSeek)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd crucible
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```bash
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # DeepSeek Configuration
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   DEEPSEEK_API_URL=https://api.deepseek.com/v1
   ```

3. **Install dependencies:**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install crucible-core dependencies
   cd ../crucible-core
   npm install
   ```

4. **Start the backend server:**
   ```bash
   cd ../backend
   npm start
   ```

   The server will start on `http://localhost:3000`

### API Endpoints

- `GET /providers` - List available AI providers
- `POST /test-openai` - Test OpenAI provider
- `POST /test-deepseek` - Test DeepSeek provider
- `POST /query` - Query multiple providers simultaneously
- `POST /query-and-synthesize` - Query providers and synthesize responses

### Example Usage

```bash
# Test individual providers
curl -X POST http://localhost:3000/test-openai \
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

## Architecture

The project uses a modular architecture:

- **crucible-core**: Core library that handles multi-provider queries and synthesis
- **backend**: Express server that provides REST API endpoints
- **Synthesis Configuration**: JSON file for customizing synthesis prompts

The backend integrates crucible-core as a local dependency, providing a clean separation between the core logic and the API layer.

## Development

- See `backend/README.md` for backend-specific setup and development
- See `crucible-core/README.md` for core library documentation and examples

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here] 