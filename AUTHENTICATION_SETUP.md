# JobTaylor Authentication & Rate Limiting Setup Guide

This guide will help you set up authentication and rate limiting for your JobTaylor Chrome extension using Supabase.

## Overview

The authentication system provides:
- **Authentication required**: All users must create an account to use the service
- **Authenticated users**: 10 resume generations per month (default, configurable)
- **Paying users**: Unlimited access with premium features
- **Secure JWT-based authentication** using Supabase Auth

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. OpenAI API key
3. Chrome extension development environment

## Step 1: Set Up Supabase Project

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

### 1.2 Configure Authentication
1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Enable **Email confirmations** (optional but recommended)
3. Configure any additional auth providers if needed

## Step 2: Set Up Database

### 2.1 Run Database Migration
1. Go to your Supabase dashboard → **SQL Editor**
2. Copy and paste the contents of `setup-database.sql`
3. Run the script to create the rate limiting table

### 2.2 Verify Table Creation
The script will create:
- `user_rate_limits` table for tracking usage
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp updates

## Step 3: Configure Environment Variables

### 3.1 Supabase Edge Function Environment
In your Supabase dashboard → **Settings** → **Edge Functions**:

```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 3.2 Chrome Extension Configuration
Update `jobtaylor-extension/auth.js`:

```javascript
// Replace these with your actual values
this.supabaseUrl = 'https://your-project-id.supabase.co';
this.supabaseAnonKey = 'your_anon_key_here';
```

## Step 4: Deploy Edge Function

### 4.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 4.2 Login to Supabase
```bash
supabase login
```

### 4.3 Link Your Project
```bash
supabase link --project-ref your-project-id
```

### 4.4 Deploy the Function
```bash
supabase functions deploy tailor-resume
```

## Step 5: Test the Setup

### 5.1 Test Authentication Requirement
1. Load the extension without signing in
2. Try to generate a resume
3. Verify that authentication is required (401 error)

### 5.2 Test Authentication
1. Click "Sign In" in the extension
2. Create an account or sign in
3. Verify access to resume generation (10 generations per month)

## Step 6: Monitor Usage

### 6.1 Check Database
Query the `user_rate_limits` table to monitor usage:

```sql
SELECT * FROM user_rate_limits ORDER BY created_at DESC;
```

### 6.2 Check Edge Function Logs
In Supabase dashboard → **Edge Functions** → **Logs**

## Configuration Options

### Rate Limiting
Modify these constants in `supabase/functions/tailor-resume/index.ts`:

```typescript
const DEFAULT_MONTHLY_LIMIT = 10; // Change this number for authenticated users
const RATE_LIMIT_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days
```

### User Types
The system supports different user types:
- **Anonymous**: Limited generations
- **Authenticated**: Unlimited (default)
- **Paying**: Unlimited + premium features

To mark a user as paying, update the database:
```sql
UPDATE user_rate_limits 
SET is_paying_user = true 
WHERE user_id = 'user-id-here';
```

## Security Considerations

### 1. API Keys
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Keep `OPENAI_API_KEY` secure on the server side
- Rotate keys regularly

### 2. Row Level Security
The database uses RLS policies to ensure:
- Users can only access their own data
- Service role can access all data for rate limiting
- Anonymous users are properly tracked

### 3. JWT Tokens
- Tokens are automatically managed by Supabase
- Tokens expire and are refreshed automatically
- Invalid tokens are rejected

## Troubleshooting

### Common Issues

#### 1. "OpenAI API key not configured"
- Check that `OPENAI_API_KEY` is set in Edge Function environment
- Verify the key is valid and has sufficient credits

#### 2. "Supabase URL not configured"
- Ensure `SUPABASE_URL` is correctly set
- Check that the URL format is correct

#### 3. "Service role key not configured"
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Ensure the key has the correct permissions

#### 4. Authentication not working
- Check that Supabase Auth is enabled
- Verify the anon key is correct in the extension
- Check browser console for errors

#### 5. Rate limiting not working
- Ensure the database migration was run successfully
- Check that RLS policies are in place
- Verify the Edge Function can access the database

### Debug Steps

1. **Check Edge Function Logs**
   ```bash
   supabase functions logs tailor-resume
   ```

2. **Test Database Connection**
   ```sql
   SELECT COUNT(*) FROM user_rate_limits;
   ```

3. **Verify Environment Variables**
   ```bash
   supabase functions list
   ```

4. **Check Browser Console**
   - Open developer tools in Chrome
   - Look for authentication errors
   - Check network requests

## Advanced Configuration

### Custom Rate Limits
To implement custom rate limits for different user tiers:

1. Add a `user_tier` column to the database
2. Modify the rate limiting logic in the Edge Function
3. Update the UI to show tier-specific limits

### Premium Features
To add premium features for paying users:

1. Check `is_paying_user` flag in the Edge Function
2. Implement feature flags based on user status
3. Update the UI to show premium features

### Analytics
To track usage analytics:

1. Create additional tables for analytics
2. Log generation events with timestamps
3. Create dashboards to monitor usage patterns

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the Supabase documentation
3. Check the Edge Function logs
4. Verify all environment variables are set correctly

## Next Steps

Once authentication is working:

1. **Implement user profiles** - Store additional user data
2. **Add subscription management** - Integrate with payment providers
3. **Create admin dashboard** - Monitor usage and manage users
4. **Add analytics** - Track usage patterns and user behavior
5. **Implement premium features** - Advanced resume templates, etc.
