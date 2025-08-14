# Environment Variables Setup

This document outlines all the environment variables required for the JobTaylor extension with authentication and rate limiting.

## Supabase Edge Function Environment Variables

These variables need to be set in your Supabase project's Edge Function environment:

### Required Variables

1. **`OPENAI_API_KEY`**
   - Description: Your OpenAI API key for generating resume and cover letter content
   - Example: `sk-...`
   - Source: [OpenAI Platform](https://platform.openai.com/api-keys)

2. **`SUPABASE_URL`**
   - Description: Your Supabase project URL
   - Example: `https://your-project-id.supabase.co`
   - Source: Supabase Dashboard → Settings → API

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Description: Supabase service role key for server-side operations
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Source: Supabase Dashboard → Settings → API → service_role key
   - ⚠️ **Important**: Keep this secret and never expose it to the client

## Client-Side Environment Variables

These variables are needed in your frontend application (Chrome extension, web app, etc.):

### Required Variables

1. **`SUPABASE_URL`**
   - Description: Your Supabase project URL (same as above)
   - Example: `https://your-project-id.supabase.co`

2. **`SUPABASE_ANON_KEY`**
   - Description: Supabase anonymous key for client-side operations
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Source: Supabase Dashboard → Settings → API → anon public key

## Setting Up Environment Variables

### For Supabase Edge Functions

1. Go to your Supabase Dashboard
2. Navigate to Settings → Edge Functions
3. Add the required environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### For Local Development

Create a `.env` file in your project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

### For Chrome Extension

Add these to your extension's manifest or configuration:

```javascript
// In your extension's config or environment
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key_here';
```

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the client-side
2. **Keep `OPENAI_API_KEY` secure** and only use it server-side
3. **Use Row Level Security (RLS)** policies in Supabase for data protection
4. **Rotate keys regularly** for better security

## Rate Limiting Configuration

The system is configured with the following defaults:
- **Authentication required**: All users must create an account to use the service
- **Authenticated users**: 10 resume generations per month (default)
- **Paying users**: Unlimited access

You can modify these limits by updating the constants in the Edge Function code.

## Database Setup

After setting up the environment variables, run the migration to create the rate limiting table:

```sql
-- This will be automatically applied when you deploy the Edge Function
-- or you can run it manually in the Supabase SQL editor
```

## Testing

To test the authentication system:

1. Deploy the Edge Function with the environment variables
2. Test with an anonymous request (no auth header)
3. Test with an authenticated request (include Bearer token)
4. Verify rate limiting works correctly

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` is set in your Supabase Edge Function environment

2. **"Supabase URL not configured"**
   - Check that `SUPABASE_URL` is correctly set

3. **"Service role key not configured"**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set and valid

4. **Authentication errors**
   - Ensure you're using the correct Supabase URL and keys
   - Check that the JWT token is valid and not expired

### Getting Help

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify all environment variables are set correctly
3. Ensure the database migration has been applied
4. Test with a simple request first
