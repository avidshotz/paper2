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
    const { jobDescription, resumeId, userId, userPitch, fullExperience, resumeName } = req.body; // REFACTORED: Changed from currentResume to userPitch

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
    Most resumes read like job logs — but the best ones read like stories of impact. If you want yours to stand out, keep these rules in mind:

Lead with results, not duties. Swap “responsible for managing schedules” with “streamlined scheduling for 5 teams, cutting delays by 20%.”

Be concise. Recruiters skim in under 10 seconds. Keep bullets to one line and cut fluff like “other duties as assigned.”

Quantify everything. Numbers give proof: customers served, revenue increased, events managed, downtime reduced.

Organize skills clearly. Break them into buckets (Technical, Operations, Soft Skills) so strengths jump out.

Trim irrelevant roles. If a job isn’t building your case, shorten or group it. One page is ideal unless you’re senior-level.

Polish education. Even unfinished coursework adds credibility if phrased cleanly (“Computer Science coursework, 2018–2020” vs “no degree”).

In short: show what you achieved, not just what you did. That’s what turns a resume from a timeline into a pitch.


Use this clean, professional resume template as a reference for formatting and structure:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resume - Clean</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
    h1, h2 { margin-bottom: 5px; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
    .contact { margin-bottom: 20px; font-size: 14px; }
    .section { margin-bottom: 20px; }
    .job { margin-bottom: 12px; }
    .job-title { font-weight: bold; }
    .company { font-style: italic; }
    ul { margin: 5px 0 10px 20px; }
  </style>
</head>
<body>

  <h1>[CANDIDATE NAME]</h1>
  <div class="contact">
    [PHONE] · [EMAIL] · 
    <a href="#">LinkedIn</a> · <a href="#">Portfolio</a>
  </div>

  <div class="section">
    <h2>Education</h2>
    <p>[UNIVERSITY] – [DEGREE] ([YEAR RANGE])</p>
  </div>

  <div class="section">
    <h2>Relevant Experience</h2>
    
    <div class="job">
      <div class="job-title">[JOB TITLE]</div>
      <div class="company">[COMPANY] – [LOCATION] | [DATE RANGE]</div>
      <ul>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-title">[JOB TITLE]</div>
      <div class="company">[COMPANY] – [LOCATION] | [DATE RANGE]</div>
      <ul>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>Additional Work Experience</h2>
    <ul>
      <li>[CATEGORY] roles ([COMPANIES]) – [KEY SKILLS/EXPERIENCES]</li>
      <li>[CATEGORY] roles ([COMPANIES]) – [KEY SKILLS/EXPERIENCES]</li>
      <li>[CATEGORY] roles ([COMPANIES]) – [KEY SKILLS/EXPERIENCES]</li>
    </ul>
  </div>

  <div class="section">
    <h2>Skills</h2>
    <p><strong>Technical:</strong> [TECHNICAL SKILLS]</p>
    <p><strong>Operations:</strong> [OPERATIONAL SKILLS]</p>
    <p><strong>Soft Skills:</strong> [SOFT SKILLS]</p>
  </div>

</body>
</html>

Please provide:
1. Key skills and keywords to highlight from the job description
2. Suggested resume modifications using this template structure
3. A tailored cover letter
4. Specific achievements or experiences to emphasize

Be specific, actionable, and professional. Use the template structure above as a guide for formatting recommendations.`;

    const userPrompt = `Please analyze this job description and provide tailored resume and cover letter recommendations:

JOB DESCRIPTION:
${jobDescription}

  USER PITCH: // REFACTORED: Changed from CURRENT RESUME CONTENT to USER PITCH
    ${userPitch || 'No pitch provided'} // REFACTORED: Changed from currentResume to userPitch

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