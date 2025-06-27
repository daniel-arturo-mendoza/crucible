const express = require('express');
const cors = require('cors');
const { queryOpenAI } = require('./llm/openai');
const { queryDeepSeek } = require('./llm/deepseek');
const { synthesizeResponses } = require('./synthesize');

const app = express();

// Middleware: CORS
app.use(cors());

// Middleware: JSON body parsing
app.use(express.json());

// Middleware: Logging
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test OpenAI endpoint
app.post('/test-openai', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await queryOpenAI(prompt);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Query endpoint
app.post('/query', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Query both models in parallel
    const [openaiResponse, deepseekResponse] = await Promise.all([
      queryOpenAI(prompt),
      queryDeepSeek(prompt)
    ]);

    // Synthesize the responses
    const result = await synthesizeResponses([openaiResponse, deepseekResponse]);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Middleware: Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

module.exports = app; 