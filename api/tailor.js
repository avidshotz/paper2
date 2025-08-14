// api/tailor.js
async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Add cache control headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobDescription, resumeId, userId, currentResume, fullExperience, resumeName } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Get OpenAI API key from environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        message: 'Please add OPENAI_API_KEY to your .env file'
      });
    }

    // Prepare the prompt for OpenAI with enhanced context
    const systemPrompt = `You are an expert resume and cover letter writer. Your task is to analyze a job description and provide tailored recommendations for a resume and cover letter that would be perfect for this position.

Please provide:
1. Key skills and keywords to highlight
2. Suggested resume modifications
3. A tailored cover letter
4. Specific achievements or experiences to emphasize

Be specific, actionable, and professional.`;

    const userPrompt = `Please analyze this job description and provide tailored resume and cover letter recommendations:

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME CONTENT:
${currentResume || 'No current resume provided'}

FULL EXPERIENCE DETAILS:
${fullExperience || 'No experience details provided'}

RESUME NAME: ${resumeName || 'Unknown'}
User ID: ${userId || 'demo-user'}
Resume ID: ${resumeId || 'demo-resume-id'}`;

    // Call OpenAI API with cache busting
    const timestamp = Date.now();
    const response = await fetch(`https://api.openai.com/v1/chat/completions?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: 'OpenAI API error', 
        details: errorData 
      });
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content;

    if (!result) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    // Return the tailored recommendations
    return res.status(200).json({
      success: true,
      result,
      jobDescription: jobDescription.substring(0, 100) + '...', // Truncated for logging
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Export for CommonJS
module.exports = handler; 