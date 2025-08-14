# JobTaylor Deployment Guide

This guide covers deploying the JobTaylor Chrome extension and API server to production.

## Prerequisites

- OpenAI API key
- A hosting platform (Vercel, Heroku, DigitalOcean, etc.)
- Chrome Web Store developer account (for extension distribution)

## 1. API Server Deployment

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy the API**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel dashboard:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Option B: Deploy to Heroku

1. **Create Heroku app**:
   ```bash
   heroku create your-jobtaylor-api
   ```

2. **Set environment variables**:
   ```bash
   heroku config:set OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Deploy**:
   ```bash
   git push heroku main
   ```

### Option C: Deploy to DigitalOcean App Platform

1. **Create a new app** in DigitalOcean dashboard
2. **Connect your GitHub repository**
3. **Set environment variables**:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8080
   ```
4. **Deploy**

## 2. Update Extension for Production

After deploying your API server, update the extension to use the production URL:

1. **Edit `jobtaylor-extension/popup.js`**:
   ```javascript
   // Change this line:
   const API_BASE_URL = 'https://your-production-domain.com';
   ```

2. **Update `jobtaylor-extension/manifest.json`**:
   ```json
   "host_permissions": [
     "https://your-production-domain.com/*",
     "https://*.linkedin.com/*",
     "https://*.indeed.com/*",
     // ... other job sites
   ]
   ```

## 3. Extension Distribution

### Option A: Chrome Web Store (Recommended)

1. **Package the extension**:
   - Zip the `jobtaylor-extension` folder
   - Include all files: manifest.json, popup.html, popup.js, content.js, icons, etc.

2. **Upload to Chrome Web Store**:
   - Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Create new item
   - Upload your zip file
   - Fill in store listing details
   - Submit for review

### Option B: Direct Distribution

1. **Package for direct installation**:
   - Zip the `jobtaylor-extension` folder
   - Share with users who can install via "Load unpacked"

## 4. Environment Variables

### Production Environment Variables

```
OPENAI_API_KEY=sk-your_actual_openai_api_key_here
NODE_ENV=production
PORT=3001 (or your platform's default)
```

### Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Consider implementing rate limiting
- Add authentication for production use

## 5. Monitoring and Maintenance

### API Monitoring

- Set up logging (e.g., with Winston or Bunyan)
- Monitor API usage and costs
- Set up alerts for errors
- Track OpenAI API usage

### Extension Updates

- Version your extension properly
- Test updates thoroughly
- Consider automatic updates via Chrome Web Store

## 6. Cost Optimization

### OpenAI API Costs

- Monitor token usage
- Consider using gpt-3.5-turbo for cost savings
- Implement usage limits
- Set up billing alerts

### Hosting Costs

- Choose appropriate hosting plan
- Monitor resource usage
- Consider serverless options for cost efficiency

## 7. Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your API allows requests from the extension
2. **API Key Issues**: Verify environment variables are set correctly
3. **Extension Not Working**: Check console for errors
4. **Rate Limits**: Implement retry logic and rate limiting

### Debug Commands

```bash
# Test API locally
npm run test

# Check API health
curl https://your-api-domain.com/api/health

# Test extension
# Load in Chrome and check console for errors
```

## 8. Performance Optimization

### API Optimization

- Implement caching for similar requests
- Optimize prompt length
- Consider response streaming for large outputs

### Extension Optimization

- Minimize bundle size
- Optimize content script performance
- Implement efficient storage usage

## 9. Security Checklist

- [ ] API keys stored in environment variables
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] Rate limiting in place
- [ ] HTTPS enabled
- [ ] Security headers set
- [ ] Regular dependency updates

## 10. Support and Maintenance

### User Support

- Create documentation for users
- Set up support channels
- Monitor user feedback

### Maintenance Schedule

- Regular dependency updates
- API key rotation
- Performance monitoring
- Security audits

---

For additional help, refer to the main README.md file or create an issue in the project repository.
