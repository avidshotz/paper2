// content.js
function extractJobText() {
    const selectors = [
      '.description__text',             // LinkedIn
      '.jobsearch-jobDescriptionText', // Indeed
      '[class*="job-description"]',
      '[class*="description"]',
      'article'
    ];
  
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 100) {
        return el.innerText.trim();
      }
    }
    return null;
  }
  
  const jobText = extractJobText();
  if (jobText) {
    chrome.storage.local.set({ jobText });
  }
  