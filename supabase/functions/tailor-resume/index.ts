// supabase/functions/tailor-resume/index.ts
// Edge Function to proxy OpenAI API calls for JobTaylor extension with authentication and rate limiting
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers defined directly in the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};
// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Rate limiting configuration  
const DEFAULT_MONTHLY_LIMIT = 10 // Default limit for new users
;
const RATE_LIMIT_WINDOW = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
;
// Function to get or create user data
async function getUserData(userId, userEmail) {
  try {
    // Check if user exists in our rate limiting table
    const { data: existingUser, error } = await supabase.from('user_rate_limits').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user data:', error);
      throw error;
    }
    if (existingUser) {
      return {
        id: existingUser.user_id,
        email: existingUser.email,
        is_authenticated: !!existingUser.email,
        is_paying_user: existingUser.is_paying_user || false,
        monthly_generations: existingUser.monthly_generations || 0,
        last_generation_date: existingUser.last_generation_date
      };
    }
    // Create new user record
    const newUser = {
      user_id: userId,
      email: userEmail || null,
      is_authenticated: !!userEmail,
      is_paying_user: false,
      monthly_generations: 0,
      last_generation_date: null,
      created_at: new Date().toISOString()
    };
    const { data: createdUser, error: createError } = await supabase.from('user_rate_limits').insert([
      newUser
    ]).select().single();
    if (createError) {
      console.error('Error creating user data:', createError);
      throw createError;
    }
    return {
      id: createdUser.user_id,
      email: createdUser.email,
      is_authenticated: !!createdUser.email,
      is_paying_user: createdUser.is_paying_user || false,
      monthly_generations: createdUser.monthly_generations || 0,
      last_generation_date: createdUser.last_generation_date
    };
  } catch (error) {
    console.error('Error in getUserData:', error);
    // Return a default user data structure if database operations fail
    return {
      id: userId,
      email: userEmail,
      is_authenticated: !!userEmail,
      is_paying_user: false,
      monthly_generations: 0
    };
  }
}
// Function to check and update rate limits
async function checkRateLimit(userData) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // If user is paying, they have unlimited access
  if (userData.is_paying_user) {
    return {
      allowed: true,
      remaining: -1
    } // -1 indicates unlimited
    ;
  }
  // Simple credit check - monthly_generations is the actual credit count
  const remainingCredits = userData.monthly_generations || 0;
  if (remainingCredits <= 0) {
    return {
      allowed: false,
      remaining: 0,
      resetDate: 'Contact admin for more credits'
    };
  }
  return {
    allowed: true,
    remaining: remainingCredits
  };
}
// Function to decrement available credits
async function incrementUsage(userId) {
  try {
    const now = new Date();
    // Get current user data
    const { data: user, error: fetchError } = await supabase.from('user_rate_limits').select('monthly_generations').eq('user_id', userId).single();
    if (fetchError) {
      console.error('Error fetching user for decrement:', fetchError);
      return;
    }
    // Decrement the credit count by 1
    const newCreditCount = Math.max(0, (user.monthly_generations || 0) - 1);
    // Update the credit count
    const { error: updateError } = await supabase.from('user_rate_limits').update({
      monthly_generations: newCreditCount,
      last_generation_date: now.toISOString()
    }).eq('user_id', userId);
    if (updateError) {
      console.error('Error updating credit count:', updateError);
    } else {
      console.log(`Credits decremented for user ${userId}. Remaining: ${newCreditCount}`);
    }
  } catch (error) {
    console.error('Error decrementing credits:', error);
  }
}
// Function to authenticate user from JWT token
async function authenticateUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Return demo user instead of throwing error
    return {
      userId: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      isAuthenticated: false
    };
  }
  try {
    const token = authHeader.replace('Bearer ', '');
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('Authentication error:', error);
      // Return demo user instead of throwing error
      return {
        userId: 'demo-user-' + Date.now(),
        email: 'demo@example.com',
        isAuthenticated: false
      };
    }
    return {
      userId: user.id,
      email: user.email,
      isAuthenticated: true
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    // Return demo user instead of throwing error
    return {
      userId: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      isAuthenticated: false
    };
  }
}
// HTML generation function - returns formatted HTML for client-side PDF generation
// Helper function to escape HTML entities that could cause URI issues
function escapeHtmlForPDF(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}
// Helper function to sanitize title for PDF service
function sanitizeTitle(title) {
  return title.replace(/[&<>"'\/]/g, '').replace(/\s+/g, ' ').trim();
}
async function generateHTML(content, title) {
  // Clean content to remove any nested HTML declarations
  let cleanContent = content;
  // Remove any nested DOCTYPE declarations
  cleanContent = cleanContent.replace(/<!DOCTYPE html>/gi, '');
  // Remove any nested <html> tags
  cleanContent = cleanContent.replace(/<\/?html[^>]*>/gi, '');
  // Remove any nested <head> sections completely
  cleanContent = cleanContent.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  // Remove any nested <body> tags but keep content
  cleanContent = cleanContent.replace(/<\/?body[^>]*>/gi, '');
  // Clean up any extra whitespace
  cleanContent = cleanContent.trim();
  // Sanitize title for PDF service compatibility
  const safeTitle = sanitizeTitle(title);
  // Note: We don't escape the content itself since it's already HTML
  // but we do sanitize the title which goes into attributes
  // Generate compact HTML with minimal whitespace
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safeTitle}</title><style>body{font-family:Arial,sans-serif;margin:20px;line-height:1.3;font-size:12px}h1{color:#2c3e50;border-bottom:2px solid #3498db;padding-bottom:5px;margin:10px 0;font-size:18px}h2{color:#34495e;margin-top:15px;margin-bottom:8px;font-size:14px}h3{color:#34495e;margin-top:12px;margin-bottom:6px;font-size:13px}p{margin:5px 0;line-height:1.2}ul{margin:5px 0;padding-left:20px}li{margin:2px 0;line-height:1.2}.header{text-align:center;margin-bottom:15px}.section{margin:10px 0}.contact-info{background:#f8f9fa;padding:10px;border-radius:5px;margin-bottom:10px}</style></head><body><div class="header"><h1>${safeTitle}</h1></div><div class="content">${cleanContent}</div></body></html>`;
  // Log HTML size for debugging
  const htmlSize = new Blob([
    html
  ]).size;
  console.log(`📊 Generated HTML size: ${(htmlSize / 1024).toFixed(1)}KB for ${safeTitle}`);
  console.log(`🧹 Content cleaned: removed nested HTML declarations and sanitized title`);
  // Warn if HTML is getting large
  if (htmlSize > 50 * 1024) {
    console.warn(`⚠️ Large HTML generated (${(htmlSize / 1024).toFixed(1)}KB) for ${safeTitle}`);
  }
  return html;
}
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error(' OPENAI_API_KEY not found in environment variables');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        message: 'Please add OPENAI_API_KEY to your Supabase environment'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Authenticate user - optional for testing
    const authHeader = req.headers.get('authorization') || '';
    let authenticatedUserId;
    let email;
    let isAuthenticated;
    // Always try to authenticate - function now handles missing auth gracefully
    const authResult = await authenticateUser(authHeader);
    authenticatedUserId = authResult.userId;
    email = authResult.email;
    isAuthenticated = authResult.isAuthenticated;
    if (isAuthenticated) {
      console.log('✅ User authenticated successfully');
    } else {
      console.log('⚠️ Using demo user for testing');
    }
    // Get or create user data for rate limiting
    const userData = await getUserData(authenticatedUserId, email);
    // Check rate limits - be more lenient for demo users
    const rateLimitCheck = await checkRateLimit(userData);
    if (!rateLimitCheck.allowed && isAuthenticated) {
      // Only enforce rate limits for authenticated users
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'You have reached your monthly limit. Please upgrade to continue.',
        remaining: rateLimitCheck.remaining,
        resetDate: rateLimitCheck.resetDate,
        upgradeRequired: true
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else if (!rateLimitCheck.allowed) {
      console.log('⚠️ Demo user rate limit reached, but allowing for testing');
    }
    // Parse request body (same format as extension sends)
    const { jobDescription, resumeId, userId, currentResume, fullExperience, resumeName } = await req.json();
    if (!jobDescription) {
      return new Response(JSON.stringify({
        error: 'Job description is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Prepare the prompt for OpenAI to generate structured content
    const systemPrompt = `You are an expert resume and cover letter writer. Your task is to analyze a job description and create TWO professional documents in HTML format.

Most resumes read like job logs — but the best ones read like stories of impact. If you want yours to stand out, keep these rules in mind:

Lead with results, not duties. Swap "responsible for managing schedules" with "streamlined scheduling for 5 teams, cutting delays by 20%."

Be concise. Recruiters skim in under 10 seconds. Keep bullets to one line and cut fluff like "other duties as assigned."

Quantify everything. Numbers give proof: customers served, revenue increased, events managed, downtime reduced.

Organize skills clearly. Break them into buckets (Technical, Operations, Soft Skills) so strengths jump out.

Trim irrelevant roles. If a job isn't building your case, shorten or group it. One page is ideal unless you're senior-level.

Polish education. Even unfinished coursework adds credibility if phrased cleanly ("Computer Science coursework, 2018–2020" vs "no degree").

In short: show what you achieved, not just what you did. That's what turns a resume from a timeline into a pitch.

Use this professional, traditional resume template as a reference for formatting and structure:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Template</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 40px;
      color: #000;
    }
    .name {
      font-size: 21pt;
      font-weight: bold;
      font-style: italic;
      text-align: center;
      margin-bottom: 5px;
    }
    .contact {
      font-size: 8pt;
      text-align: center;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      text-align: left;
    }
    .education, .experience, .additional {
      font-size: 12pt;
    }
    .experience-entry {
      margin-bottom: 15px;
    }
    .company-line {
      display: flex;
      justify-content: space-between;
      font-size: 12pt;
      font-weight: bold;
    }
    .company-type-line {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      font-weight: bold;
    }
    .job-title {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    ul {
      padding-left: 20px;
      margin: 5px 0;
    }
    ul li {
      list-style-type: "- ";
      font-size: 9pt;
      margin-bottom: 3px;
    }
    .skills-header {
      font-size: 7pt;
      font-weight: bold;
      margin-top: 10px;
    }
    .skills {
      font-size: 7pt;
    }

    /* Print-friendly CSS */
    @media print {
      body {
        margin: 20mm;
        color: #000;
        background: #fff;
      }
      .resume, .experience-entry, .education, .skills {
        box-shadow: none;
      }
      a {
        color: #000;
        text-decoration: none;
      }
      ul li {
        font-size: 9pt;
      }
    }
  </style>
</head>
<body>
  <div class="name">[CANDIDATE NAME]</div>
  <div class="contact">[PHONE] - [EMAIL] - [LINKEDIN] - [PORTFOLIO]</div>

  <h2>Education</h2>
  <div class="education">
    [DEGREE] in [FIELD]<br>
    [UNIVERSITY] — [YEAR RANGE]
  </div>

  <h2>Relevant Experience</h2>
  <div class="experience">
    <div class="experience-entry">
      <div class="company-line">
        <div>[COMPANY NAME]</div>
        <div>[LOCATION]</div>
      </div>
      <div class="company-type-line">
        <div>[COMPANY TYPE/INDUSTRY]</div>
        <div>[DATE RANGE]</div>
      </div>
      <div class="job-title">[JOB TITLE]</div>
      <ul>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
      </ul>
    </div>

    <div class="experience-entry">
      <div class="company-line">
        <div>[COMPANY NAME]</div>
        <div>[LOCATION]</div>
      </div>
      <div class="company-type-line">
        <div>[COMPANY TYPE/INDUSTRY]</div>
        <div>[DATE RANGE]</div>
      </div>
      <div class="job-title">[JOB TITLE]</div>
      <ul>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
        <li>[KEY ACHIEVEMENT/RESPONSIBILITY]</li>
      </ul>
    </div>

    <!-- Additional experience entries can be added here following the same structure -->
  </div>

  <h2>Additional</h2>
  <div class="skills-header">Skills</div>
  <div class="skills">
    [TECHNICAL SKILLS], [OPERATIONAL SKILLS], [SOFT SKILLS]
  </div>
</body>
</html>

Please provide your response in this EXACT format:

===RESUME===
[Professional resume content here using the template structure above - this will be converted to HTML]
===END_RESUME===

===COVER_LETTER===
[Professional cover letter content here - this will be converted to HTML]
===END_COVER_LETTER===

Both documents should be properly formatted, professional, and tailored to the specific job description. Use the template structure above as a guide for formatting recommendations. The template supports multiple experience entries and maintains a clean, traditional appearance.`;
    const userPrompt = `Please analyze this job description and provide a tailored resume and cover letter:

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME CONTENT:
${currentResume || 'No current resume provided'}

FULL EXPERIENCE DETAILS:
${fullExperience || 'No experience details provided'}

RESUME NAME: ${resumeName || 'Unknown'}
User ID: ${userId || 'demo-user'}
Resume ID: ${resumeId || 'demo-resume-id'}`;
    // Call OpenAI API (same as extension)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8'
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
        max_tokens: 4000,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return new Response(JSON.stringify({
        error: 'OpenAI API error',
        details: errorData
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const data = await response.json();
    const result = data.choices[0]?.message?.content;
    if (!result) {
      return new Response(JSON.stringify({
        error: 'No response from OpenAI'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('OpenAI Response:', result);
    console.log('OpenAI Response Length:', result?.length || 0);
    // Parse the structured response
    const resumeMatch = result.match(/===RESUME===\n([\s\S]*?)\n===END_RESUME===/);
    const coverLetterMatch = result.match(/===COVER_LETTER===\n([\s\S]*?)\n===END_COVER_LETTER===/);
    console.log('Resume Match:', !!resumeMatch);
    console.log('Cover Letter Match:', !!coverLetterMatch);
    if (!resumeMatch) {
      console.log('⚠️ Resume parsing failed. Raw response preview:', result?.substring(0, 500));
    }
    if (!coverLetterMatch) {
      console.log('⚠️ Cover letter parsing failed. Raw response preview:', result?.substring(0, 500));
    }
    let resumeContent = resumeMatch ? resumeMatch[1].trim() : null;
    let coverLetterContent = coverLetterMatch ? coverLetterMatch[1].trim() : null;
    // Fallback: if parsing failed, try to extract content from the raw response
    if (!resumeContent || !coverLetterContent) {
      console.log('Parsing failed, using fallback extraction');
      // Try to find HTML content in the response
      const htmlMatch = result.match(/<html[^>]*>[\s\S]*?<\/html>/i);
      if (htmlMatch) {
        const htmlContent = htmlMatch[0];
        // Try to extract resume and cover letter from HTML
        const resumeHtmlMatch = htmlContent.match(/<h1[^>]*>[\s\S]*?<\/h1>/i);
        const coverLetterHtmlMatch = htmlContent.match(/<p[^>]*>Dear[\s\S]*?<\/p>/i);
        if (resumeHtmlMatch) {
          resumeContent = resumeHtmlMatch[0];
        }
        if (coverLetterHtmlMatch) {
          coverLetterContent = coverLetterHtmlMatch[0];
        }
      }
      // If still no content, use the raw response
      if (!resumeContent) {
        console.log('⚠️ Using raw response as resume content');
        resumeContent = result || 'Error: No content generated';
      }
      if (!coverLetterContent) {
        console.log('⚠️ Using raw response as cover letter content');
        coverLetterContent = result || 'Error: No content generated';
      }
    }
    // Sanitize content to prevent URI malformed errors in PDF service
    // Remove or replace characters that might cause issues
    function sanitizeContent(content) {
      return content.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes with regular quotes
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes with regular quotes
      .replace(/[\u2013\u2014]/g, '-') // Replace em/en dashes with regular dashes
      .replace(/\u2026/g, '...') // Replace ellipsis
      .trim();
    }
    resumeContent = sanitizeContent(resumeContent);
    coverLetterContent = sanitizeContent(coverLetterContent);
    console.log('Final content lengths:', {
      resumeContent: resumeContent?.length || 0,
      coverLetterContent: coverLetterContent?.length || 0
    });
    // Extract company name from job description for file naming
    const companyMatch = jobDescription.match(/Company[:\s]+([^\n]+)/i) || jobDescription.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Consulting|Inc|LLC|Corp|Company)/i);
    const companyName = companyMatch ? companyMatch[1].trim() : 'Company';
    // Generate HTML for client-side PDF conversion
    const resumeHTML = await generateHTML(resumeContent, 'Professional Resume');
    const coverLetterHTML = await generateHTML(coverLetterContent, 'Cover Letter');
    // Increment usage count for rate limiting
    await incrementUsage(authenticatedUserId);
    // Return HTML data for client-side PDF generation
    return new Response(JSON.stringify({
      success: true,
      resumeHTML: resumeHTML,
      coverLetterHTML: coverLetterHTML,
      resumeFileName: `${companyName}_Resume.pdf`,
      coverLetterFileName: `${companyName}_CoverLetter.pdf`,
      resumeContent: resumeContent,
      coverLetterContent: coverLetterContent,
      rateLimit: {
        remaining: rateLimitCheck.remaining,
        isAuthenticated: isAuthenticated,
        isPayingUser: userData.is_paying_user
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
