// build-extension.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔨 Building Rezlie extension with environment variables...');

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.error('❌ .env file not found! Please create a .env file with your Supabase credentials.');
    console.log('📝 Example .env file:');
    console.log('SUPABASE_URL=https://your-project-id.supabase.co');
    console.log('SUPABASE_ANON_KEY=your-anon-key-here');
    process.exit(1);
}

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables!');
    console.log('Required: SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

// Read the auth.js file
const authFilePath = path.join(__dirname, 'jobtaylor-extension', 'auth.js');
let authContent = fs.readFileSync(authFilePath, 'utf8');

// Replace placeholders with environment variables
authContent = authContent.replace(
    /this\.supabaseUrl = 'YOUR_SUPABASE_URL'/g,
    `this.supabaseUrl = '${process.env.SUPABASE_URL}'`
);

authContent = authContent.replace(
    /this\.supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'/g,
    `this.supabaseAnonKey = '${process.env.SUPABASE_ANON_KEY}'`
);

// Write the updated file
fs.writeFileSync(authFilePath, authContent);

// Also update popup.js with the Supabase URL for API calls
const popupFilePath = path.join(__dirname, 'jobtaylor-extension', 'popup.js');
let popupContent = fs.readFileSync(popupFilePath, 'utf8');

// Replace the hardcoded Supabase URL in popup.js
popupContent = popupContent.replace(
    /const SUPABASE_URL = 'https:\/\/sdlmyaffbnjkmzwpdwqp\.supabase\.co'/g,
    `const SUPABASE_URL = '${process.env.SUPABASE_URL}'`
);

fs.writeFileSync(popupFilePath, popupContent);

console.log('✅ Extension built successfully!');
console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
console.log(`🔑 Anon Key: ${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log('');
console.log('🚀 Next steps:');
console.log('1. Load the extension in Chrome (chrome://extensions/)');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select the rezlie-extension folder');
console.log('4. Test the authentication system!');
