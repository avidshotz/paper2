# 🎯 Rezlie Chrome Extension

A powerful Chrome extension that uses AI to generate tailored resumes and cover letters based on job descriptions. Features secure authentication, rate limiting, and a modern user interface.

## ✨ Features

- 🔐 **Secure Authentication** - Supabase-powered user management
- 📊 **Rate Limiting** - 10 resume generations per month for free users
- 🤖 **AI-Powered** - OpenAI GPT-4 for intelligent resume tailoring
- 📄 **Multiple Formats** - Resume and cover letter generation
- 🎨 **Modern UI** - Clean, intuitive interface
- 🔒 **Privacy First** - All data stays secure and private

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- A Supabase project
- OpenAI API key

### 1. Set Up Supabase

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

### 2. Set Up Environment Variables

```bash
# Create .env file
npm run setup

# Edit .env with your credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Build and Load Extension

```bash
# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the jobtaylor-extension folder
```

### 4. Test Authentication

1. Click the Rezlie extension icon
2. Try to generate a resume → Should show "Please sign in"
3. Click "Sign In" → Create an account
4. Try generating again → Should work!

## 🛠️ Development

### Watch Mode

For development, use watch mode to automatically rebuild when you change the `.env` file:

```bash
npm run watch
```

### Available Scripts

```bash
npm run setup      # Create .env file from template
npm run build      # Build extension with environment variables
npm run watch      # Watch for changes and rebuild automatically
npm run dev        # Start development server
npm test          # Run tests
```

## 📁 Project Structure

```
jobtaylor-extension/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── content.js            # Content script for job extraction
├── auth.js               # Authentication helper
├── icon*.png             # Extension icons
└── ...

supabase/
├── functions/
│   └── tailor-resume/
│       └── index.ts      # Edge Function for API
└── migrations/
    └── 001_create_rate_limits_table.sql

setup-database.sql         # Database setup script
build-extension.js         # Build script for environment variables
watch-extension.js         # Watch script for development
.env.example              # Environment variables template
```

## 🔧 Configuration

### Rate Limiting

Modify the rate limits in `supabase/functions/tailor-resume/index.ts`:

```typescript
const DEFAULT_MONTHLY_LIMIT = 10; // Change this number
```

### User Types

The system supports different user types:
- **Authenticated users**: 10 generations per month (default)
- **Paying users**: Unlimited access

To mark a user as paying, update the database:
```sql
UPDATE user_rate_limits 
SET is_paying_user = true 
WHERE user_id = 'user-id-here';
```

## 🔒 Security

- **Service role key** only used in Edge Function (server-side)
- **Anonymous key** only used in client-side code
- **Row Level Security (RLS)** protects user data
- **JWT tokens** handle authentication securely
- **Environment variables** keep secrets safe

## 📊 Monitoring

### Check Usage

Query the database to monitor usage:
```sql
SELECT * FROM user_rate_limits ORDER BY created_at DESC;
```

### View Logs

Check Edge Function logs in your Supabase dashboard:
1. Go to **Edge Functions**
2. Click on `tailor-resume`
3. View **Logs**

## 🐛 Troubleshooting

### Common Issues

1. **"Extension not loading"**
   - Run `npm run build` first
   - Check `.env` file has correct values
   - Verify extension folder structure

2. **"Authentication not working"**
   - Check Supabase project setup
   - Verify Edge Function is deployed
   - Check browser console for errors

3. **"Rate limiting not working"**
   - Ensure database migration completed
   - Check Edge Function logs
   - Verify RLS policies are in place

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify environment variables are set correctly
3. Check Supabase Edge Function logs
4. Test database connection with simple queries

## 📚 Documentation

- [Quick Start Guide](QUICK_START.md) - Get up and running fast
- [Authentication Setup](AUTHENTICATION_SETUP.md) - Detailed setup guide
- [Environment Variables](ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Ensure nothing is missed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

If you need help:
1. Check the troubleshooting section above
2. Review the documentation
3. Check Supabase and OpenAI documentation
4. Open an issue with detailed error information

---

**🎉 Happy job hunting with Rezlie!** 