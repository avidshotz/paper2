const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'jobtaylor-extension')));

// Import the API handler
const tailorHandler = require('./api/tailor');

// API Routes
app.post('/api/tailor', async (req, res) => {
  try {
    // Convert Express req/res to Vercel-style handler
    const vercelReq = {
      method: req.method,
      body: req.body,
      headers: req.headers
    };
    
    const vercelRes = {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      setHeader: (name, value) => res.setHeader(name, value),
      json: (data) => res.json(data)
    };
    
    await tailorHandler(vercelReq, vercelRes);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'JobTaylor API is running'
  });
});

// Serve the extension popup
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'jobtaylor-extension', 'popup.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JobTaylor API server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/tailor`);
  console.log(`🌐 Extension popup: http://localhost:${PORT}/`);
  
  console.log('🔑 API Key loaded:', process.env.OPENAI_API_KEY ? 'YES' : 'NO');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  Warning: OPENAI_API_KEY not found in .env file');
    console.log('💡 Create a .env file in the project root with:');
    console.log('   OPENAI_API_KEY=your_openai_api_key_here');
  } else {
    console.log('✅ OpenAI API key loaded from .env file');
  }
});

module.exports = app;
