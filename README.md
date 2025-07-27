# Job Taylor Extension - OpenAI API Integration

This Chrome extension extracts job descriptions from various job sites and uses OpenAI's API to generate tailored resume and cover letter recommendations.

## Setup Instructions

### 1. OpenAI API Key
You need to obtain an OpenAI API key:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

### 2. Environment Variables
Set up the following environment variables in your deployment platform (Vercel, Netlify, etc.):

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Deploy the API
The `api/tailor.js` file contains the serverless function that handles OpenAI API calls. Deploy this to:
- **Vercel**: Place the `api/` folder in your project root
- **Netlify**: Place in `netlify/functions/`
- **Other platforms**: Follow their serverless function guidelines

### 4. Update Extension Configuration
Update the API endpoint URL in `popup.js`:

```javascript
// Replace with your actual deployed API URL
const response = await fetch('https://your-deployed-app.vercel.app/api/tailor', {
```

### 5. Install the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `jobtaylor-extension` folder

## How It Works

1. **Content Script** (`content.js`): Extracts job descriptions from job sites using CSS selectors
2. **Popup** (`popup.js`): Sends the job description to the API endpoint
3. **API Endpoint** (`api/tailor.js`): 
   - Validates the request
   - Calls OpenAI API with a structured prompt
   - Returns tailored resume and cover letter recommendations

## API Endpoint Details

**Endpoint**: `POST /api/tailor`

**Request Body**:
```json
{
  "jobDescription": "Full job description text",
  "resumeId": "user-resume-id",
  "userId": "user-id"
}
```

**Response**:
```json
{
  "success": true,
  "result": "Tailored recommendations from OpenAI",
  "jobDescription": "Truncated job description...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

- Never expose your OpenAI API key in client-side code
- Use environment variables for sensitive configuration
- Consider implementing rate limiting
- Add user authentication for production use

## Cost Management

- Monitor your OpenAI API usage
- Consider implementing usage limits
- Use appropriate models (gpt-4 is more expensive than gpt-3.5-turbo)
- Set up billing alerts

## Troubleshooting

1. **API Key Error**: Ensure `OPENAI_API_KEY` is set in your environment variables
2. **CORS Issues**: Make sure your API endpoint allows requests from your extension
3. **Rate Limits**: OpenAI has rate limits; implement retry logic if needed
4. **Token Limits**: Job descriptions might be too long; consider truncating if needed 