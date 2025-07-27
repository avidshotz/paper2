// test-api.js - Simple test script for the API endpoint
const API_URL = 'https://your-vercel-app.vercel.app/api/tailor';

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
    console.log('Testing API endpoint...');
    
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

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API test successful!');
      console.log('Response:', data);
    } else {
      console.log('❌ API test failed!');
      console.log('Status:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.log('❌ API test failed with error:', error.message);
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