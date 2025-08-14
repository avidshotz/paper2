# 🚀 Rezlie Quick Start Guide

Get your Rezlie Chrome extension with authentication up and running in minutes!

## Prerequisites

- Node.js (v18 or higher)
- A Supabase project
- OpenAI API key

## Step 1: Set Up Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and API keys

2. **Set Up Database**
   - Go to **SQL Editor** in your Supabase dashboard
   - Copy and paste the contents of `setup-database.sql`
   - Click **"Run"**

3. **Create Edge Function**
   - Go to **Edge Functions** in your Supabase dashboard
   - Click **"Create a new function"**
   - Name it: `tailor-resume`
   - Copy the contents of `supabase/functions/tailor-resume/index.ts` into the editor
   - Set environment variables:
     ```
     OPENAI_API_KEY=your-openai-key-here
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
     ```
   - Click **"Deploy"**

## Step 2: Set Up Environment Variables

1. **Create .env file**
   ```bash
   npm run setup
   ```

2. **Edit .env file**
   ```bash
   # Open .env and replace with your actual values
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Build Extension

```bash
npm run build
```

## Step 4: Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"**
3. Click **"Load unpacked"**
4. Select the `jobtaylor-extension` folder
5. The extension should now appear in your extensions list

## Step 5: Test Authentication

1. **Click the Rezlie extension icon**
2. **Try to generate a resume** → Should show "Please sign in"
3. **Click "Sign In"** → Create an account
4. **Try generating again** → Should work!

## Development Workflow

For development, use the watch mode:

```bash
npm run watch
```

This will automatically rebuild the extension when you change the `.env` file.

## Troubleshooting

### "Extension not loading"
- Make sure you ran `npm run build` first
- Check that your `.env` file has the correct values
- Verify the extension folder structure is correct

### "Authentication not working"
- Check that your Supabase project is set up correctly
- Verify the Edge Function is deployed
- Check browser console for errors

### "Rate limiting not working"
- Make sure the database migration ran successfully
- Check Edge Function logs in Supabase dashboard

## Next Steps

Once authentication is working:

1. **Test rate limiting** - Generate 10 resumes to see the limit
2. **Monitor usage** - Check the `user_rate_limits` table in Supabase
3. **Customize limits** - Modify `DEFAULT_MONTHLY_LIMIT` in the Edge Function
4. **Add premium features** - Implement paying user logic

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Check Supabase Edge Function logs
4. Ensure the database migration completed successfully

Happy coding! 🎉
