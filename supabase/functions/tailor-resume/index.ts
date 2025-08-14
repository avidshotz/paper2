// supabase/functions/tailor-resume/index.ts
// Edge Function to proxy OpenAI API calls for JobTaylor extension with authentication and rate limiting

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers defined directly in the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting configuration
const DEFAULT_MONTHLY_LIMIT = 10 // Default limit for authenticated users
const RATE_LIMIT_WINDOW = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

// Interface for user data
interface UserData {
  id: string
  email?: string
  is_authenticated: boolean
  is_paying_user: boolean
  monthly_generations: number
  last_generation_date?: string
}

// Function to get or create user data
async function getUserData(userId: string, userEmail?: string): Promise<UserData> {
  try {
    // Check if user exists in our rate limiting table
    const { data: existingUser, error } = await supabase
      .from('user_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user data:', error)
      throw error
    }

    if (existingUser) {
      return {
        id: existingUser.user_id,
        email: existingUser.email,
        is_authenticated: !!existingUser.email,
        is_paying_user: existingUser.is_paying_user || false,
        monthly_generations: existingUser.monthly_generations || 0,
        last_generation_date: existingUser.last_generation_date
      }
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
    }

    const { data: createdUser, error: createError } = await supabase
      .from('user_rate_limits')
      .insert([newUser])
      .select()
      .single()

    if (createError) {
      console.error('Error creating user data:', createError)
      throw createError
    }

    return {
      id: createdUser.user_id,
      email: createdUser.email,
      is_authenticated: !!createdUser.email,
      is_paying_user: createdUser.is_paying_user || false,
      monthly_generations: createdUser.monthly_generations || 0,
      last_generation_date: createdUser.last_generation_date
    }
  } catch (error) {
    console.error('Error in getUserData:', error)
    // Return a default user data structure if database operations fail
    return {
      id: userId,
      email: userEmail,
      is_authenticated: !!userEmail,
      is_paying_user: false,
      monthly_generations: 0
    }
  }
}

// Function to check and update rate limits
async function checkRateLimit(userData: UserData): Promise<{ allowed: boolean; remaining: number; resetDate?: string }> {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // If user is paying, they have unlimited access
  if (userData.is_paying_user) {
    return { allowed: true, remaining: -1 } // -1 indicates unlimited
  }

  // Check if we need to reset the monthly count
  let shouldReset = false
  if (userData.last_generation_date) {
    const lastGeneration = new Date(userData.last_generation_date)
    if (lastGeneration < currentMonth) {
      shouldReset = true
    }
  } else {
    shouldReset = true
  }

  // Reset monthly count if needed
  if (shouldReset) {
    userData.monthly_generations = 0
  }

  // Check if user has exceeded their limit
  if (userData.monthly_generations >= DEFAULT_MONTHLY_LIMIT) {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return { 
      allowed: false, 
      remaining: 0, 
      resetDate: nextMonth.toISOString() 
    }
  }

  return { 
    allowed: true, 
    remaining: DEFAULT_MONTHLY_LIMIT - userData.monthly_generations 
  }
}

// Function to increment usage count
async function incrementUsage(userId: string): Promise<void> {
  try {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Get current user data
    const { data: user, error: fetchError } = await supabase
      .from('user_rate_limits')
      .select('monthly_generations, last_generation_date')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user for increment:', fetchError)
      return
    }

    // Check if we need to reset the count
    let newCount = 1
    if (user.last_generation_date) {
      const lastGeneration = new Date(user.last_generation_date)
      if (lastGeneration >= currentMonth) {
        newCount = (user.monthly_generations || 0) + 1
      }
    }

    // Update the usage count
    const { error: updateError } = await supabase
      .from('user_rate_limits')
      .update({
        monthly_generations: newCount,
        last_generation_date: now.toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating usage count:', updateError)
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
  }
}

// Function to authenticate user from JWT token
async function authenticateUser(authHeader: string): Promise<{ userId: string; email?: string; isAuthenticated: boolean }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required')
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Authentication error:', error)
      throw new Error('Invalid authentication token')
    }

    return { 
      userId: user.id, 
      email: user.email, 
      isAuthenticated: true 
    }
  } catch (error) {
    console.error('Error authenticating user:', error)
    throw new Error('Authentication failed')
  }
}

// PDF generation function
async function generatePDF(content: string, title: string): Promise<string> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          line-height: 1.3; 
          font-size: 12px;
        }
        h1 { 
          color: #2c3e50; 
          border-bottom: 2px solid #3498db; 
          padding-bottom: 5px; 
          margin: 10px 0;
          font-size: 18px;
        }
        h2 { 
          color: #34495e; 
          margin-top: 15px; 
          margin-bottom: 8px;
          font-size: 14px;
        }
        h3 { 
          color: #34495e; 
          margin-top: 12px; 
          margin-bottom: 6px;
          font-size: 13px;
        }
        p { 
          margin: 5px 0; 
          line-height: 1.2;
        }
        ul { 
          margin: 5px 0; 
          padding-left: 20px;
        }
        li { 
          margin: 2px 0; 
          line-height: 1.2;
        }
        .header { 
          text-align: center; 
          margin-bottom: 15px; 
        }
        .section { 
          margin: 10px 0; 
        }
        .contact-info { 
          background: #f8f9fa; 
          padding: 10px; 
          border-radius: 5px; 
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
    </body>
    </html>
  `;
  
  // Just return the HTML as-is, let the extension handle encoding
  return html;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get OpenAI API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      console.error(' OPENAI_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          message: 'Please add OPENAI_API_KEY to your Supabase environment'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Authenticate user - required for all requests
    const authHeader = req.headers.get('authorization') || ''
    let authenticatedUserId: string
    let email: string | undefined
    let isAuthenticated: boolean

    try {
      const authResult = await authenticateUser(authHeader)
      authenticatedUserId = authResult.userId
      email = authResult.email
      isAuthenticated = authResult.isAuthenticated
    } catch (authError) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          message: 'Please sign in to use JobTaylor. Create an account to get started.',
          authRequired: true
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get or create user data for rate limiting
    const userData = await getUserData(authenticatedUserId, email)

    // Check rate limits (now simplified since all users are authenticated)
    const rateLimitCheck = await checkRateLimit(userData)
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'You have reached your monthly limit. Please upgrade to continue.',
          remaining: rateLimitCheck.remaining,
          resetDate: rateLimitCheck.resetDate,
          upgradeRequired: true
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body (same format as extension sends)
    const { jobDescription, resumeId, userId, currentResume, fullExperience, resumeName } = await req.json()

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare the prompt for OpenAI to generate structured content
    const systemPrompt = `You are an expert resume and cover letter writer. Your task is to analyze a job description and create TWO professional documents in HTML format:

Please provide your response in this EXACT format:

===RESUME===
[Professional resume content here - this will be converted to HTML]
===END_RESUME===

===COVER_LETTER===
[Professional cover letter content here - this will be converted to HTML]
===END_COVER_LETTER===

Both documents should be properly formatted, professional, and tailored to the specific job description. The content will be converted to professional HTML documents.`

    const userPrompt = `Please analyze this job description and provide a tailored resume and cover letter:

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME CONTENT:
${currentResume || 'No current resume provided'}

FULL EXPERIENCE DETAILS:
${fullExperience || 'No experience details provided'}

RESUME NAME: ${resumeName || 'Unknown'}
User ID: ${userId || 'demo-user'}
Resume ID: ${resumeId || 'demo-resume-id'}`

    // Call OpenAI API (same as extension)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 4000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error', 
          details: errorData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('OpenAI Response:', result);

    // Parse the structured response
    const resumeMatch = result.match(/===RESUME===\n([\s\S]*?)\n===END_RESUME===/);
    const coverLetterMatch = result.match(/===COVER_LETTER===\n([\s\S]*?)\n===END_COVER_LETTER===/);
    
    console.log('Resume Match:', !!resumeMatch);
    console.log('Cover Letter Match:', !!coverLetterMatch);
    
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
        resumeContent = result;
      }
      if (!coverLetterContent) {
        coverLetterContent = result;
      }
    }

    // Extract company name from job description for file naming
    const companyMatch = jobDescription.match(/Company[:\s]+([^\n]+)/i) || 
                        jobDescription.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Consulting|Inc|LLC|Corp|Company)/i);
    const companyName = companyMatch ? companyMatch[1].trim() : 'Company';

    // Generate PDFs
    const resumePDF = await generatePDF(resumeContent, 'Professional Resume');
    const coverLetterPDF = await generatePDF(coverLetterContent, 'Cover Letter');

    // Increment usage count for rate limiting
    await incrementUsage(authenticatedUserId)

    // Return PDF data with rate limit info
    return new Response(
      JSON.stringify({
        success: true,
        resumePDF: resumePDF,
        coverLetterPDF: coverLetterPDF,
        resumeFileName: `${companyName}_Resume.html`,
        coverLetterFileName: `${companyName}_CoverLetter.html`,
        resumeContent: resumeContent,
        coverLetterContent: coverLetterContent,
        rateLimit: {
          remaining: rateLimitCheck.remaining,
          isAuthenticated: isAuthenticated,
          isPayingUser: userData.is_paying_user
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
