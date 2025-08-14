// config.js - Configuration for JobTaylor Chrome Extension

const config = {
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001',
  
  // OpenAI API Key - Replace this with your actual key from .env.local
  OPENAI_API_KEY: 'sk-your-api-key-here', // TODO: Replace with your actual OpenAI API key
  
  // Development vs Production
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // OpenAI Configuration
  OPENAI_MODEL: 'gpt-4',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  
  // Extension Configuration
  EXTENSION_NAME: 'JobTaylor',
  VERSION: '1.0.0',
  
  // Job Sites Support
  SUPPORTED_SITES: [
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    'monster.com',
    'careerbuilder.com'
  ]
};

// For production deployment, update this URL:
// config.API_BASE_URL = 'https://your-production-domain.com';

module.exports = config;
