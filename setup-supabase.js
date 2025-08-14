// setup-supabase.js - Script to configure Supabase URL in extension
const fs = require('fs');
const path = require('path');

console.log('🚀 JobTaylor Supabase Setup');
console.log('============================');

// Get Supabase URL from user
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter your Supabase project URL (e.g., https://your-project.supabase.co): ', (supabaseUrl) => {
  try {
    // Clean up the URL
    const cleanUrl = supabaseUrl.trim().replace(/\/$/, '');
    
    // Read current popup.js
    const popupPath = path.join(__dirname, 'jobtaylor-extension', 'popup.js');
    let popupContent = fs.readFileSync(popupPath, 'utf8');
    
    // Replace the placeholder URL
    popupContent = popupContent.replace(
      /const SUPABASE_URL = 'https:\/\/your-project-ref\.supabase\.co';/,
      `const SUPABASE_URL = '${cleanUrl}';`
    );
    
    // Write updated popup.js
    fs.writeFileSync(popupPath, popupContent);
    
    console.log('✅ Supabase URL configured successfully!');
    console.log(`🔗 Using: ${cleanUrl}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Create a Supabase project at https://supabase.com');
    console.log('2. Add your OpenAI API key to Supabase environment variables:');
    console.log('   - Go to Settings > API > Environment Variables');
    console.log('   - Add: OPENAI_API_KEY = your_openai_api_key_here');
    console.log('3. Deploy the Edge Function:');
    console.log('   - Install Supabase CLI: npm install -g supabase');
    console.log('   - Run: supabase functions deploy tailor-resume');
    console.log('4. Load the extension in Chrome');
    console.log('');
    console.log('🎉 Your extension will now use Supabase for secure API calls!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
});
