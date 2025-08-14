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

function extractJobText() {
    const selectors = [
        // LinkedIn
        '.description__text',
        '.job-description',
        '[data-job-description]',
        
        // Indeed
        '.jobsearch-jobDescriptionText',
        '#jobDescriptionText',
        
        // Glassdoor
        '.jobDescriptionContent',
        '.desc',
        
        // Monster
        '.job-description',
        '.description',
        
        // CareerBuilder
        '.job-description',
        '.description',
        
        // Generic selectors
        '[class*="job-description"]',
        '[class*="description"]',
        '[id*="job-description"]',
        '[id*="description"]',
        'article',
        '.content',
        '.main-content'
    ];
  
    for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
            const text = el.innerText || el.textContent;
            if (text && text.trim().length > 200) {
                console.log('Job description found using selector:', sel);
                return text.trim();
            }
        }
    }
    
    // Fallback: try to find any large text block that might be a job description
    const allElements = document.querySelectorAll('p, div, section, article');
    for (const el of allElements) {
        const text = el.innerText || el.textContent;
        if (text && text.trim().length > 500 && 
            (text.toLowerCase().includes('job') || 
             text.toLowerCase().includes('position') || 
             text.toLowerCase().includes('role') ||
             text.toLowerCase().includes('responsibilities') ||
             text.toLowerCase().includes('requirements'))) {
            console.log('Job description found using fallback method');
            return text.trim();
        }
    }
    
    return null;
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
  