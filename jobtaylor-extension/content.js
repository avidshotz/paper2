// content.js - Job description extraction for JobTaylor extension with authentication

// Initialize authentication
let auth = null;

// Initialize auth when the script loads
async function initAuth() {
    try {
        // Import the auth class
        const { JobTaylorAuth } = await import(chrome.runtime.getURL('auth.js'));
        auth = new JobTaylorAuth();
        
        // Check authentication status
        const isAuthenticated = await auth.isAuthenticated();
        console.log('Authentication status:', isAuthenticated);
        
        // Listen for auth state changes
        auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
            updateUIForAuthState(!!session);
        });
        
        // Initial UI update
        updateUIForAuthState(isAuthenticated);
    } catch (error) {
        console.error('Failed to initialize authentication:', error);
    }
}

// Update UI based on authentication state
function updateUIForAuthState(isAuthenticated) {
    // You can add UI updates here based on auth state
    // For example, showing different notifications or UI elements
    console.log('UI updated for auth state:', isAuthenticated);
}

// Site-specific job description scrapers
class JobDescriptionScrapers {
    constructor() {
        this.scrapers = {
            'linkedin.com': this.linkedinScraper,
            'indeed.com': this.indeedScraper,
            'glassdoor.com': this.glassdoorScraper,
            'monster.com': this.monsterScraper,
            'careerbuilder.com': this.careerbuilderScraper,
            'ziprecruiter.com': this.ziprecruiterScraper
        };
    }

    // LinkedIn scraper
    linkedinScraper() {
    const selectors = [
        '.description__text',
        '.job-description',
        '[data-job-description]',
            '.jobs-description__content',
            '.jobs-box__html-content'
        ];
        return this.trySelectors(selectors, 'LinkedIn');
    }
        
    // Indeed scraper
    indeedScraper() {
        const selectors = [
        '.jobsearch-jobDescriptionText',
        '#jobDescriptionText',
            '.jobsearch-JobComponent-description',
            '.jobsearch-JobComponent-embeddedHeader'
        ];
        return this.trySelectors(selectors, 'Indeed');
    }
        
    // Glassdoor scraper
    glassdoorScraper() {
        const selectors = [
        '.jobDescriptionContent',
        '.desc',
            '[data-test="jobDescription"]',
            '.jobDescriptionWrapper'
        ];
        return this.trySelectors(selectors, 'Glassdoor');
    }
        
    // Monster scraper
    monsterScraper() {
        const selectors = [
        '.job-description',
        '.description',
            '[data-testid="job-description"]',
            '.job-description-content'
        ];
        return this.trySelectors(selectors, 'Monster');
    }
        
    // CareerBuilder scraper
    careerbuilderScraper() {
        const selectors = [
        '.job-description',
        '.description',
            '.job-description-content',
            '[data-cy="job-description"]'
        ];
        return this.trySelectors(selectors, 'CareerBuilder');
    }

    // ZipRecruiter scraper
    ziprecruiterScraper() {
        console.log('ZipRecruiter scraper activated');
        
        // Try to extract from page data first (dynamic content)
        const pageDataResult = this.extractFromZipRecruiterPageData();
        if (pageDataResult) {
            console.log('ZipRecruiter: Successfully extracted from page data');
            return pageDataResult;
        }
        console.log('ZipRecruiter: Page data extraction failed, trying selectors');
        
        const selectors = [
            // Job description content selectors (for job detail view)
            '[data-testid="jobDescription"]',
            '.jobDescriptionSection',
            '.job_description',
            '.jobDescriptionContainer',
            '.job-description-content',
            
            // More specific ZipRecruiter selectors
            '[data-testid="job-description-section"]',
            '[data-testid="jobDetailsSection"]',
            '.job-description-wrapper',
            '.job-details-content',
            '.job-details-description',
            
            // Additional specific selectors
            '.job-description-text',
            
            // Fallback to larger content areas but avoid search results
            '.job-content:not(.search-results)',
            '.main-content:not(.search-results)',
            'main .content:not(.search-results)'
        ];
        
        // Try the standard selector approach
        const result = this.trySelectors(selectors, 'ZipRecruiter');
        if (result) {
            return result;
        }
        
        // Special approach for ZipRecruiter: look for job description after "Job description" heading
        const jobDescriptionElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent && el.textContent.toLowerCase().trim().startsWith('job description')
        );
        
        for (const heading of jobDescriptionElements) {
            // Look for content in next siblings or parent container
            let contentElement = heading.nextElementSibling;
            let attempts = 0;
            
            while (contentElement && attempts < 5) {
                const text = contentElement.innerText || contentElement.textContent;
                if (text && text.trim().length > 300 && 
                    !text.toLowerCase().includes('1-click apply') &&
                    !text.toLowerCase().includes('showing') &&
                    !text.toLowerCase().includes('results')) {
                    console.log('ZipRecruiter job description found after "Job description" heading');
                    return text.trim();
                }
                contentElement = contentElement.nextElementSibling;
                attempts++;
            }
            
            // Try parent container
            const parent = heading.parentElement;
            if (parent) {
                const text = parent.innerText || parent.textContent;
                if (text && text.trim().length > 300 && 
                    !text.toLowerCase().includes('1-click apply') &&
                    !text.toLowerCase().includes('showing') &&
                    !text.toLowerCase().includes('results')) {
                    console.log('ZipRecruiter job description found in parent container');
                    return text.trim();
                }
            }
        }
        
        return null;
    }

    // Extract job description from ZipRecruiter's page data
    extractFromZipRecruiterPageData() {
        try {
            console.log('ZipRecruiter: Checking window.getJobDetailsResponse...');
            
            // Look for the getJobDetailsResponse data in window or script tags
            if (window.getJobDetailsResponse && 
                window.getJobDetailsResponse.jobDetails && 
                window.getJobDetailsResponse.jobDetails.htmlFullDescription) {
                
                console.log('ZipRecruiter: Found window.getJobDetailsResponse data');
                
                const htmlDescription = window.getJobDetailsResponse.jobDetails.htmlFullDescription;
                const text = this.cleanHTMLDescription(htmlDescription);
                
                if (text && text.trim().length > 300) {
                    console.log('ZipRecruiter job description found in window.getJobDetailsResponse');
                    return text.trim();
                }
            }

            // Try to find it in script tags containing page data
            const scripts = document.querySelectorAll('script');
            console.log('ZipRecruiter: Found', scripts.length, 'script tags to search');
            
            for (const script of scripts) {
                const content = script.textContent || script.innerHTML;
                
                // Look for getJobDetailsResponse or htmlFullDescription
                if (content.includes('htmlFullDescription')) {
                    try {
                        // Try to extract the job description from the script content
                        const htmlDescMatch = content.match(/"htmlFullDescription"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
                        if (htmlDescMatch) {
                            let htmlDescription = htmlDescMatch[1]
                                .replace(/\\"/g, '"')
                                .replace(/\\n/g, '\n')
                                .replace(/\\t/g, '\t')
                                .replace(/\\\\/g, '\\');
                            
                            const text = this.cleanHTMLDescription(htmlDescription);
                            
                            if (text && text.trim().length > 300) {
                                console.log('ZipRecruiter job description found in script tag');
                                return text.trim();
                            }
                        }
                    } catch (e) {
                        console.log('Error parsing script content:', e);
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.log('Error extracting from ZipRecruiter page data:', error);
            return null;
        }
    }

    // Clean HTML description and convert to readable text
    cleanHTMLDescription(htmlDescription) {
        try {
            // First decode any HTML entities like \u003c (which is <)
            let decodedHtml = htmlDescription
                .replace(/\\u003c/g, '<')
                .replace(/\\u003e/g, '>')
                .replace(/\\u0026/g, '&')
                .replace(/\\u0027/g, "'")
                .replace(/\\u0022/g, '"');
            
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = decodedHtml;
            
            // Process the content to maintain readable formatting
            const processedText = this.processHTMLNodes(tempDiv);
            
            // Clean up extra whitespace and line breaks
            return processedText
                .replace(/\n\s*\n\s*\n/g, '\n\n')  // Max 2 consecutive line breaks
                .replace(/^\s+|\s+$/g, '')          // Trim start/end
                .replace(/[ \t]+/g, ' ');           // Normalize spaces
        } catch (error) {
            console.log('Error cleaning HTML description:', error);
            // Fallback: just strip basic HTML tags
            return htmlDescription.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }

    // Process HTML nodes to maintain readable formatting
    processHTMLNodes(element) {
        let result = '';
        
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Add line breaks for block elements
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    result += '\n\n' + node.textContent + '\n';
                } else if (['p', 'div'].includes(tagName)) {
                    result += '\n' + this.processHTMLNodes(node) + '\n';
                } else if (tagName === 'ul' || tagName === 'ol') {
                    result += '\n' + this.processHTMLNodes(node);
                } else if (tagName === 'li') {
                    result += '\n• ' + this.processHTMLNodes(node);
                } else if (tagName === 'br') {
                    result += '\n';
                } else if (tagName === 'strong' || tagName === 'b') {
                    result += this.processHTMLNodes(node);
                } else {
                    result += this.processHTMLNodes(node);
                }
            }
        }
        
        return result;
    }

    // Helper method to try selectors for a specific site
    trySelectors(selectors, siteName) {
        console.log(`Trying selectors for ${siteName}:`, selectors);
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`Selector "${selector}" found ${elements.length} elements`);
            
            for (const element of elements) {
                const text = element.innerText || element.textContent;
                if (text && text.trim().length > 200) {
                    // Additional filtering for search results pages
                    if (siteName === 'ZipRecruiter') {
                        // Skip if it looks like search results
                        if (text.toLowerCase().includes('1-click apply') || 
                            text.toLowerCase().includes('showing') ||
                            text.toLowerCase().includes('results') ||
                            text.includes('$') && text.includes('/hr') && text.length < 1000) {
                            console.log(`Skipping element that looks like search results (length: ${text.length})`);
                            continue;
                        }
                    }
                    
                    console.log(`Job description found on ${siteName} using selector:`, selector);
                    console.log(`Content preview:`, text.substring(0, 200) + '...');
                    return text.trim();
                }
            }
        }
        return null;
    }

    // Get the appropriate scraper for current domain
    getScraper() {
        const hostname = window.location.hostname.toLowerCase();
        for (const domain in this.scrapers) {
            if (hostname.includes(domain)) {
                return this.scrapers[domain].bind(this);
            }
        }
        return null;
    }

    // Generic fallback scraper
    genericScraper() {
        const selectors = [
        '[class*="job-description"]',
        '[class*="description"]',
        '[id*="job-description"]',
        '[id*="description"]',
        'article',
        '.content',
        '.main-content'
    ];
  
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const text = element.innerText || element.textContent;
            if (text && text.trim().length > 200) {
                    console.log('Job description found using generic selector:', selector);
                return text.trim();
            }
        }
    }
    
        // Final fallback: try to find any large text block that might be a job description
        // But be very restrictive to avoid search results
    const allElements = document.querySelectorAll('p, div, section, article');
        for (const element of allElements) {
            const text = element.innerText || element.textContent;
        if (text && text.trim().length > 500 && 
            (text.toLowerCase().includes('job') || 
             text.toLowerCase().includes('position') || 
             text.toLowerCase().includes('role') ||
             text.toLowerCase().includes('responsibilities') ||
             text.toLowerCase().includes('requirements'))) {
                
                // Skip if it looks like search results (ZipRecruiter specific)
                if (text.toLowerCase().includes('1-click apply') || 
                    text.toLowerCase().includes('showing') ||
                    text.toLowerCase().includes('results') ||
                    text.toLowerCase().includes('jobs in') ||
                    (text.includes('$') && text.includes('/hr') && text.length < 2000)) {
                    console.log('Generic fallback: Skipping search results content');
                    continue;
                }
                
            console.log('Job description found using fallback method');
            return text.trim();
        }
    }
    
    return null;
    }
}

// Main extraction function using the new modular approach
function extractJobText() {
    const scrapers = new JobDescriptionScrapers();
    
    // Try site-specific scraper first
    const siteSpecificScraper = scrapers.getScraper();
    if (siteSpecificScraper) {
        const result = siteSpecificScraper();
        if (result) {
            return result;
        }
    }
    
    // Fallback to generic scraper
    console.log('No site-specific scraper found, trying generic approach');
    return scrapers.genericScraper();
}

// Extract job description when page loads
function extractAndStoreJobDescription() {
    const jobText = extractJobText();
    if (jobText) {
        console.log('Job description extracted:', jobText.substring(0, 100) + '...');
        chrome.storage.local.set({ jobText });
        
        // Show a small notification that job description was found
        showJobDescriptionNotification();
    } else {
        console.log('No job description found on this page');
    }
}

// Show a small notification when job description is found
function showJobDescriptionNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📄</span>
            <div>
                <div style="font-weight: 600;">Job Description Found!</div>
                <div style="font-size: 12px; opacity: 0.9;">Click the JobTaylor extension to use it</div>
            </div>
        </div>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Run extraction when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractAndStoreJobDescription);
} else {
    extractAndStoreJobDescription();
}

// Also run extraction when URL changes (for SPA sites)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(extractAndStoreJobDescription, 1000); // Wait for page to load
    }
}).observe(document, { subtree: true, childList: true });

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractJobDescription') {
        const jobText = extractJobText();
        sendResponse({ jobText });
    } else if (request.action === 'getAuthStatus') {
        // Return authentication status
        sendResponse({ 
            isAuthenticated: auth ? auth.isAuthenticated() : false,
            auth: auth 
        });
    } else if (request.action === 'getAuthHeader') {
        // Return authorization header for API calls
        if (auth) {
            auth.getAuthHeader().then(header => {
                sendResponse({ authHeader: header });
            });
            return true; // Indicates async response
        } else {
            sendResponse({ authHeader: null });
        }
    }
});

// Initialize authentication when script loads
initAuth();
  