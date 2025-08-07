// test-api.js - Simple test script for the API endpoint
const API_URL = process.env.API_URL || 'http://localhost:3000/api/tailor';

async function testAPI() {
  const testJobDescription = `
  Senior Software Engineer
  
  We are looking for a Senior Software Engineer to join our team. The ideal candidate will have:
  
  Requirements:
  - 5+ years of experience in software development
  - Proficiency in JavaScript, Python, and React
  - Experience with cloud platforms (AWS, Azure, or GCP)
  - Strong problem-solving skills
  - Excellent communication abilities
  
  Responsibilities:
  - Design and implement scalable software solutions
  - Collaborate with cross-functional teams
  - Mentor junior developers
  - Participate in code reviews
  - Contribute to technical architecture decisions
  
  Benefits:
  - Competitive salary
  - Health insurance
  - 401(k) matching
  - Flexible work arrangements
  `;

  try {
    console.log('🧪 Testing API endpoint...');
    console.log('📍 URL:', API_URL);
    console.log('📤 Sending test job description...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobDescription: testJobDescription,
        resumeId: 'test-resume-id',
        userId: 'test-user'
      })
    });

    console.log('📥 Response status:', response.status);
    
    // Try to get response text first to debug
    const responseText = await response.text();
    console.log('📄 Response text:', responseText.substring(0, 200) + '...');
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response');
      console.log('🔍 This might mean the API endpoint is not deployed yet');
      console.log('💡 Try running: npm start (to start local dev server)');
      console.log('💡 Or deploy to Vercel first: npm run deploy');
      return;
    }
    
    if (response.ok) {
      console.log('✅ API test successful!');
      console.log('📋 Response data:', data);
    } else {
      console.log('❌ API test failed!');
      console.log('📊 Status:', response.status);
      console.log('🚨 Error:', data);
    }
  } catch (error) {
    console.log('❌ API test failed with error:', error.message);
    console.log('💡 Make sure your API endpoint is running');
    console.log('💡 For local development: npm start');
    console.log('💡 For production: deploy to Vercel first');
  }
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  testAPI();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testAPI };
} 