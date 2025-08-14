# JobTaylor Supabase Setup Guide

This guide will help you set up JobTaylor to use Supabase for secure API calls instead of bundling API keys in the extension.

## 🚀 Quick Setup

### 1. Configure Extension
```bash
node setup-supabase.js
```
This will prompt you for your Supabase project URL and update the extension automatically.

### 2. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL (e.g., `https://your-project.supabase.co`)

### 3. Add OpenAI API Key
1. In your Supabase dashboard, go to **Settings > API > Environment Variables**
2. Add a new variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)

### 4. Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy tailor-resume
```

### 5. Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `jobtaylor-extension` folder
4. The extension is now ready to use!

## 🔧 How It Works

### Before (Insecure)
```
Extension → OpenAI API (with bundled API key)
```

### After (Secure)
```
Extension → Supabase Edge Function → OpenAI API (with server-side API key)
```

## 📁 File Structure
```
project/
├── jobtaylor-extension/          # Chrome extension
│   ├── popup.js                  # Updated to use Supabase
│   └── manifest.json             # Updated permissions
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   └── cors.ts           # CORS configuration
│       └── tailor-resume/
│           └── index.ts          # Edge Function
├── setup-supabase.js             # Setup script
└── SUPABASE_SETUP.md             # This file
```

## 🔒 Security Benefits

✅ **No API keys in extension code**  
✅ **API key stored securely on Supabase servers**  
✅ **Rate limiting and monitoring possible**  
✅ **Easy to add user authentication later**  
✅ **CORS properly configured**  

## 🛠️ Troubleshooting

### "Function not found" error
- Make sure you deployed the function: `supabase functions deploy tailor-resume`
- Check your Supabase URL is correct in `popup.js`

### "OpenAI API key not configured" error
- Verify your API key is set in Supabase Environment Variables
- Check the variable name is exactly `OPENAI_API_KEY`

### CORS errors
- The Edge Function includes proper CORS headers
- Make sure your Supabase URL is correct

### Extension not loading
- Check the manifest.json has the correct permissions
- Verify all files are in the right locations

## 🔄 Updating

When you update your OpenAI API key:
1. Update it in Supabase Environment Variables
2. Redeploy the function: `supabase functions deploy tailor-resume`

No changes needed to the extension!

## 🎯 Next Steps

Once this is working, you can easily add:
- User authentication with Supabase Auth
- Usage tracking and rate limiting
- Multiple user support
- Database storage for resumes and history

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase function logs: `supabase functions logs tailor-resume`
3. Verify your API key and Supabase URL are correct
