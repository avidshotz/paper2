// content.js - Job description extraction for JobTaylor extension

console.log('🔧 JobTaylor content script loaded on:', window.location.href);

// Extract job description from ZipRecruiter search results page
function extractJobText() {
    console.log('🔍 Extracting job description from ZipRecruiter...');
    
    // Check if we're on a search results page
    const currentUrl = window.location.href;
    const isSearchPage = currentUrl.includes('/jobs-search') || 
                       currentUrl.includes('/search') || 
                       currentUrl.includes('?search=');
    
    if (isSearchPage) {
        console.log('ZipRecruiter: On search results page, looking for visible job description');
        
        // Debug: dump all visible text content
        console.log('=== DEBUG: All visible text content ===');
        const allElements = document.querySelectorAll('p, div, section, article');
        for (let i = 0; i < Math.min(20, allElements.length); i++) {
            const element = allElements[i];
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && 
                            rect.bottom > 0 && 
                            rect.left < window.innerWidth && 
                            rect.right > 0;
            
            if (isVisible) {
                const text = element.innerText || element.textContent;
                if (text && text.trim().length > 50) {
                    console.log(`Element ${i}:`, text.substring(0, 200) + '...');
                }
            }
        }
        console.log('=== END DEBUG ===');
        
        return extractFromSearchResultsPage();
    } else {
        console.log('ZipRecruiter: On job detail page, using standard extraction');
        return extractFromJobDetailPage();
    }
}

// Extract from search results page (what user is currently looking at)
function extractFromSearchResultsPage() {
    try {
        console.log('ZipRecruiter: Looking for currently visible job description...');
        
        // First, try to extract from the js_variables script tag (most reliable for ZipRecruiter)
        console.log('ZipRecruiter: Trying to extract from js_variables script...');
        const jsVariablesScript = document.getElementById('js_variables');
        if (jsVariablesScript) {
            try {
                const jsData = JSON.parse(jsVariablesScript.textContent);
                console.log('ZipRecruiter: Found js_variables data');
                
                // Look for job description in various possible paths
                let jobDescription = null;
                
                // Check common paths where job description might be stored
                const possiblePaths = [
                    'getJobDetailsResponse.jobDetails.htmlFullDescription',
                    'getJobDetailsResponse.jobDetails.description',
                    'jobDetails.htmlFullDescription', 
                    'jobDetails.description',
                    'job.description',
                    'job.htmlDescription',
                    'htmlFullDescription',
                    'description'
                ];
                
                // Helper function to get nested object properties
                function getNestedProperty(obj, path) {
                    return path.split('.').reduce((current, key) => {
                        return current && current[key] !== undefined ? current[key] : null;
                    }, obj);
                }
                
                for (const path of possiblePaths) {
                    const value = getNestedProperty(jsData, path);
                    if (value && typeof value === 'string' && value.length > 100) {
                        console.log(`ZipRecruiter: Found job description at path: ${path}`);
                        jobDescription = value;
                        break;
                    }
                }
                
                if (jobDescription) {
                    // Clean HTML tags and extract text
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = jobDescription;
                    const cleanText = tempDiv.textContent || tempDiv.innerText || '';
                    console.log('ZipRecruiter: Extracted from js_variables:', cleanText.substring(0, 200) + '...');
                    return cleanJobDescription(cleanText);
                }
            } catch (error) {
                console.log('ZipRecruiter: Error parsing js_variables:', error);
            }
        }
        
        // Check if we're actually on a search results page with multiple job listings
        const searchIndicators = document.querySelectorAll('[data-testid="jobCard"], .jobCard, .job-card, .search-result, .job-listing');
        if (searchIndicators.length > 5) {
            console.log('ZipRecruiter: Detected search results page with multiple job cards. User should click on a specific job first.');
            return null;
        }
        
        // First, try to find job description using specific HTML selectors
        console.log('ZipRecruiter: Trying specific HTML selectors first...');
        const jobDescSelectors = [
            // Data test IDs (most reliable)
            '[data-testid="jobDescription"]',
            '[data-testid="job-description-section"]',
            '[data-testid="jobDetailsSection"]',
            '[data-testid="job-description"]',
            '[data-testid="description"]',
            '[data-testid="job-details"]',
            
            // Common class names
            '.jobDescriptionSection',
            '.job_description',
            '.jobDescriptionContainer',
            '.job-description-content',
            '.job-description-wrapper',
            '.job-details-content',
            '.job-details-description',
            '.job-description',
            '.job-details',
            '.description',
            '.job-content',
            '.job-body',
            '.job-info',
            '.job-summary',
            '.job-overview',
            '.job-requirements',
            '.job-responsibilities',
            '.job-qualifications',
            
            // More specific selectors
            '[class*="job-description"]',
            '[class*="job-details"]',
            '[class*="description"]',
            '[class*="job-content"]',
            '[class*="job-body"]',
            
            // ID-based selectors
            '#job-description',
            '#job-details',
            '#description',
            '#job-content',
            '#job-body',
            
            // Semantic HTML elements that might contain job descriptions
            'article[class*="job"]',
            'section[class*="job"]',
            'div[class*="job"]',
            'main[class*="job"]'
        ];
        
        for (const selector of jobDescSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`ZipRecruiter: Trying selector "${selector}": found ${elements.length} elements`);
            
            for (const element of elements) {
                const text = element.innerText || element.textContent;
                if (text && text.trim().length > 200) {
                    // Skip if it looks like job listing cards
                    if (text.toLowerCase().includes('1-click apply') ||
                        text.toLowerCase().includes('showing') ||
                        text.toLowerCase().includes('results') ||
                        text.toLowerCase().includes('jobs in') ||
                        (text.match(/\$\d+[K]?\/[a-z]+/gi) && text.match(/\$\d+[K]?\/[a-z]+/gi).length > 3)) {
                        continue;
                    }
                    
                    console.log(`ZipRecruiter: Found job description using selector: ${selector}`);
                    console.log('ZipRecruiter: Preview:', text.substring(0, 200) + '...');
                    return cleanJobDescription(text.trim());
                }
            }
        }
        
        // Fallback: Look for job description content that's currently visible
        console.log('ZipRecruiter: No specific selectors found, trying general element search...');
        const allElements = document.querySelectorAll('p, div, section, article');
        console.log('ZipRecruiter: Found', allElements.length, 'total elements to check');
        
        let bestMatch = null;
        let bestScore = 0;
        let debugInfo = [];
        
        for (const element of allElements) {
            // Check if element is visible in viewport
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && 
                            rect.bottom > 0 && 
                            rect.left < window.innerWidth && 
                            rect.right > 0;
            
            if (!isVisible) continue;
            
            const text = element.innerText || element.textContent;
            if (!text || text.trim().length < 100) continue; // Lowered threshold to catch shorter job descriptions
            
            // Skip elements that are clearly company information sections or job listing cards
            if (text.toLowerCase().includes('working at') || 
                text.toLowerCase().includes('breakroom') ||
                text.toLowerCase().includes('most people') ||
                text.toLowerCase().includes('powered by real frontline workers') ||
                text.toLowerCase().includes('apply') ||
                text.toLowerCase().includes('save job') ||
                text.toLowerCase().includes('report') ||
                // Skip job listing cards and search results
                text.toLowerCase().includes('1-click apply') ||
                text.toLowerCase().includes('full-time') ||
                text.toLowerCase().includes('part-time') ||
                text.toLowerCase().includes('contractor') ||
                text.toLowerCase().includes('temporary') ||
                text.toLowerCase().includes('on-site') ||
                text.toLowerCase().includes('remote') ||
                text.toLowerCase().includes('hybrid') ||
                // Skip salary ranges in job cards
                text.match(/\$\d+[K]?\/[a-z]+/i) ||
                text.match(/\$\d+\.\d+[K]?\/[a-z]+/i) ||
                // Skip location patterns from job cards
                text.match(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/i) ||
                // Skip pagination and search results
                text.toLowerCase().includes('showing') ||
                text.toLowerCase().includes('results') ||
                text.toLowerCase().includes('page') ||
                text.toLowerCase().includes('jobs in') ||
                text.toLowerCase().includes('small & medium businesses') ||
                text.toLowerCase().includes('enterprise businesses') ||
                text.toLowerCase().includes('partner with us') ||
                text.toLowerCase().includes('your privacy is our priority') ||
                // Skip job titles that are just short phrases (likely from job cards)
                (text.length < 100 && !text.toLowerCase().includes('required') && 
                 !text.toLowerCase().includes('qualifications') && 
                 !text.toLowerCase().includes('responsibilities') && 
                 !text.toLowerCase().includes('duties') && 
                 !text.toLowerCase().includes('skills') && 
                 !text.toLowerCase().includes('experience') && 
                 !text.toLowerCase().includes('job description') && 
                 !text.toLowerCase().includes('overview') && 
                 !text.toLowerCase().includes('summary'))) {
                continue;
            }
            
            // Look for elements that contain job description indicators
            const hasJobKeywords = text.toLowerCase().includes('required qualifications') ||
                                 text.toLowerCase().includes('preferred qualifications') ||
                                 text.toLowerCase().includes('skills & abilities') ||
                                 text.toLowerCase().includes('working conditions') ||
                                 text.toLowerCase().includes('what our') ||
                                 text.toLowerCase().includes('enjoy most about the role') ||
                                 text.toLowerCase().includes('do you have a passion') ||
                                 text.toLowerCase().includes('as a ') ||
                                 text.toLowerCase().includes('you will be') ||
                                 text.toLowerCase().includes('you\'ll be') ||
                                 text.toLowerCase().includes('retail sales specialist') ||
                                 text.toLowerCase().includes('spectrum') ||
                                 // More generic job description keywords
                                 text.toLowerCase().includes('join our team') ||
                                 text.toLowerCase().includes('we are looking for') ||
                                 text.toLowerCase().includes('we are seeking') ||
                                 text.toLowerCase().includes('we need') ||
                                 text.toLowerCase().includes('position available') ||
                                 text.toLowerCase().includes('job opportunity') ||
                                 text.toLowerCase().includes('career opportunity') ||
                                 text.toLowerCase().includes('remote work') ||
                                 text.toLowerCase().includes('flexible schedule') ||
                                 text.toLowerCase().includes('training') ||
                                 text.toLowerCase().includes('ai') ||
                                 text.toLowerCase().includes('chatbot') ||
                                 text.toLowerCase().includes('data annotation') ||
                                 text.toLowerCase().includes('quality') ||
                                 text.toLowerCase().includes('help train');
            
            // Look for elements that start with job description content
            const startsWithJobContent = text.toLowerCase().includes('do you have a passion') ||
                                       text.toLowerCase().includes('as a ') ||
                                       text.toLowerCase().includes('you will be') ||
                                       text.toLowerCase().includes('you\'ll be');
            
            if (hasJobKeywords || startsWithJobContent) {
                // Calculate score based on content quality and visibility
                const score = text.length + 
                            (hasJobKeywords ? 1000 : 0) + 
                            (startsWithJobContent ? 500 : 0) +
                            // Bonus for elements that are more centered in viewport
                            (Math.abs(rect.top + rect.height/2 - window.innerHeight/2) < 200 ? 200 : 0);
                
                debugInfo.push({
                    text: text.substring(0, 100) + '...',
                    score: score,
                    hasJobKeywords: hasJobKeywords,
                    startsWithJobContent: startsWithJobContent,
                    length: text.length
                });
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = text.trim();
                }
            }
        }
        
        console.log('ZipRecruiter: Debug info for potential matches:', debugInfo);
        
        if (bestMatch) {
            console.log('ZipRecruiter: Found visible job description with score:', bestScore);
            return cleanJobDescription(bestMatch);
        }
        
        // Fallback: look for ANY large text blocks that might be job descriptions
        console.log('ZipRecruiter: Trying fallback method...');
        for (const element of allElements) {
            const text = element.innerText || element.textContent;
            if (text && text.trim().length > 300) {
                // Skip job listing cards and search results in fallback too
                if (text.toLowerCase().includes('1-click apply') ||
                    text.toLowerCase().includes('showing') ||
                    text.toLowerCase().includes('results') ||
                    text.toLowerCase().includes('jobs in') ||
                    text.toLowerCase().includes('small & medium businesses') ||
                    text.toLowerCase().includes('enterprise businesses') ||
                    text.toLowerCase().includes('partner with us') ||
                    text.toLowerCase().includes('your privacy is our priority') ||
                    // Skip if it contains too many job card patterns
                    (text.match(/\$\d+[K]?\/[a-z]+/gi) && text.match(/\$\d+[K]?\/[a-z]+/gi).length > 3) ||
                    (text.match(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/gi) && text.match(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/gi).length > 3)) {
                    continue;
                }
                // Check if it looks like a job description (not navigation/search results)
                const isLikelyJobDesc = text.toLowerCase().includes('required') ||
                                      text.toLowerCase().includes('preferred') ||
                                      text.toLowerCase().includes('qualifications') ||
                                      text.toLowerCase().includes('skills') ||
                                      text.toLowerCase().includes('abilities') ||
                                      text.toLowerCase().includes('working conditions') ||
                                      text.toLowerCase().includes('do you have a passion') ||
                                      text.toLowerCase().includes('as a ') ||
                                      text.toLowerCase().includes('you will be') ||
                                      text.toLowerCase().includes('you\'ll be') ||
                                      text.toLowerCase().includes('retail sales specialist') ||
                                      text.toLowerCase().includes('spectrum') ||
                                      text.toLowerCase().includes('enhancing the customer experience') ||
                                      // More generic job description keywords
                                      text.toLowerCase().includes('join our team') ||
                                      text.toLowerCase().includes('we are looking for') ||
                                      text.toLowerCase().includes('we are seeking') ||
                                      text.toLowerCase().includes('we need') ||
                                      text.toLowerCase().includes('position available') ||
                                      text.toLowerCase().includes('job opportunity') ||
                                      text.toLowerCase().includes('career opportunity') ||
                                      text.toLowerCase().includes('remote work') ||
                                      text.toLowerCase().includes('flexible schedule') ||
                                      text.toLowerCase().includes('training') ||
                                      text.toLowerCase().includes('ai') ||
                                      text.toLowerCase().includes('chatbot') ||
                                      text.toLowerCase().includes('data annotation') ||
                                      text.toLowerCase().includes('quality') ||
                                      text.toLowerCase().includes('help train');
                
                // Make sure it's not the "Working at" section or other unwanted content
                const isUnwanted = text.toLowerCase().includes('working at') &&
                                 text.toLowerCase().includes('breakroom') &&
                                 text.toLowerCase().includes('most people');
                
                if (isLikelyJobDesc && !isUnwanted) {
                    console.log('ZipRecruiter: Found job description (fallback)');
                    console.log('ZipRecruiter: Preview:', text.substring(0, 200) + '...');
                    return cleanJobDescription(text.trim());
                }
            }
        }
        
        // Last resort: look for any text that contains job-related content
        console.log('ZipRecruiter: Trying last resort method...');
        for (const element of allElements) {
            const text = element.innerText || element.textContent;
            if (text && text.trim().length > 500) {
                // Skip job listing cards and search results in last resort too
                if (text.toLowerCase().includes('1-click apply') ||
                    text.toLowerCase().includes('showing') ||
                    text.toLowerCase().includes('results') ||
                    text.toLowerCase().includes('jobs in') ||
                    text.toLowerCase().includes('small & medium businesses') ||
                    text.toLowerCase().includes('enterprise businesses') ||
                    text.toLowerCase().includes('partner with us') ||
                    text.toLowerCase().includes('your privacy is our priority') ||
                    // Skip if it contains too many job card patterns
                    (text.match(/\$\d+[K]?\/[a-z]+/gi) && text.match(/\$\d+[K]?\/[a-z]+/gi).length > 3) ||
                    (text.match(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/gi) && text.match(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/gi).length > 3)) {
                    continue;
                }
                
                // Look for the specific content from your HTML model
                if (text.toLowerCase().includes('do you have a passion for connecting with people') ||
                    text.toLowerCase().includes('retail sales specialist at spectrum') ||
                    text.toLowerCase().includes('enhancing the customer experience while meeting sales')) {
                    
                    console.log('ZipRecruiter: Found specific job description content');
                    console.log('ZipRecruiter: Preview:', text.substring(0, 200) + '...');
                    return cleanJobDescription(text.trim());
                }
            }
        }
        
        console.log('ZipRecruiter: No job description found in search results');
        return null;
        
    } catch (error) {
        console.log('Error extracting from search results page:', error);
        return null;
    }
}

// Extract from job detail page
function extractFromJobDetailPage() {
    try {
        console.log('ZipRecruiter: Extracting from job detail page...');
        
        // Try to extract from page data first (dynamic content)
        if (window.getJobDetailsResponse && 
            window.getJobDetailsResponse.jobDetails && 
            window.getJobDetailsResponse.jobDetails.htmlFullDescription) {
            
            console.log('ZipRecruiter: Found window.getJobDetailsResponse data');
            const htmlDescription = window.getJobDetailsResponse.jobDetails.htmlFullDescription;
            const text = cleanHTMLDescription(htmlDescription);
            
            if (text && text.trim().length > 300) {
                console.log('ZipRecruiter job description found in window.getJobDetailsResponse');
                return text.trim();
            }
        }
        
        // Try specific selectors for job detail pages
        const selectors = [
            // Data test IDs (most reliable)
            '[data-testid="jobDescription"]',
            '[data-testid="job-description-section"]',
            '[data-testid="jobDetailsSection"]',
            '[data-testid="job-description"]',
            '[data-testid="description"]',
            '[data-testid="job-details"]',
            
            // Common class names
            '.jobDescriptionSection',
            '.job_description',
            '.jobDescriptionContainer',
            '.job-description-content',
            '.job-description-wrapper',
            '.job-details-content',
            '.job-details-description',
            '.job-description',
            '.job-details',
            '.description',
            '.job-content',
            '.job-body',
            '.job-info',
            '.job-summary',
            '.job-overview',
            '.job-requirements',
            '.job-responsibilities',
            '.job-qualifications',
            
            // More specific selectors
            '[class*="job-description"]',
            '[class*="job-details"]',
            '[class*="description"]',
            '[class*="job-content"]',
            '[class*="job-body"]',
            
            // ID-based selectors
            '#job-description',
            '#job-details',
            '#description',
            '#job-content',
            '#job-body',
            
            // Semantic HTML elements that might contain job descriptions
            'article[class*="job"]',
            'section[class*="job"]',
            'div[class*="job"]',
            'main[class*="job"]'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`ZipRecruiter: Trying selector "${selector}": found ${elements.length} elements`);
            
            for (const element of elements) {
                const text = element.innerText || element.textContent;
                if (text && text.trim().length > 300) {
                    console.log(`ZipRecruiter: Job description found using selector: ${selector}`);
                    return cleanJobDescription(text.trim());
                }
            }
        }
        
        return null;
        
        } catch (error) {
        console.log('Error extracting from job detail page:', error);
            return null;
        }
    }

// Clean HTML description by removing HTML tags and formatting
function cleanHTMLDescription(htmlDescription) {
    try {
        // Create a temporary element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlDescription;
        
        // Get text content and clean it
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up the text
        text = text.replace(/\s+/g, ' ').trim();
        
        // Remove unwanted sections
        text = cleanJobDescription(text);
        
        return text;
        } catch (error) {
            console.log('Error cleaning HTML description:', error);
        return htmlDescription;
    }
}

// Clean job description by removing unwanted sections
function cleanJobDescription(text) {
    if (!text) return text;
    
    // Look for the substring starting point
    const startMarker = "HERE IS WHERE YOU START YOUR SUBSTRING:";
    const startIndex = text.indexOf(startMarker);
    
    if (startIndex !== -1) {
        // Extract everything from the marker onwards
        let cleanedText = text.substring(startIndex + startMarker.length).trim();
        
        // Remove the marker text itself
        cleanedText = cleanedText.replace(startMarker, '').trim();
        
        // Clean up any remaining unwanted content
        cleanedText = cleanedText.replace(/^[^\w]*/, ''); // Remove leading non-word characters
        
        return cleanedText;
    }
    
    // New approach: Look for the actual job description boundaries
    // Find content between "posted X days ago" and "Report" button
    const lines = text.split('\n');
    let startLine = -1;
    let endLine = -1;
    
    console.log('ZipRecruiter: Starting boundary detection with', lines.length, 'lines');
    console.log('ZipRecruiter: First 10 lines for debugging:', lines.slice(0, 10));
    
    // First, try to find the start of job description
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for the start of job description (after "posted X days ago")
        if (line.match(/posted \d+ days? ago/i) && startLine === -1) {
            startLine = i + 1; // Start from next line
            continue;
        }
        
        // Look for rating system sections and skip over them
        // Rating sections typically appear between job stats and job description
        if (line.toLowerCase().includes('rating') ||
            line.toLowerCase().includes('stars') ||
            line.toLowerCase().includes('out of 5') ||
            line.toLowerCase().includes('employee rating') ||
            line.toLowerCase().includes('company rating') ||
            line.toLowerCase().includes('workplace rating') ||
            line.toLowerCase().includes('culture rating') ||
            line.toLowerCase().includes('benefits rating') ||
            line.toLowerCase().includes('career growth') ||
            line.toLowerCase().includes('work-life balance') ||
            line.toLowerCase().includes('management') ||
            line.toLowerCase().includes('compensation') ||
            line.toLowerCase().includes('job security') ||
            line.toLowerCase().includes('overall rating') ||
            // Look for rating patterns like "4.2 out of 5" or "4.2/5"
            line.match(/\d+\.\d+\s*(out of|out of 5|\/5)/i) ||
            // Look for percentage patterns like "84% recommend"
            line.match(/\d+%\s*(recommend|approve|satisfied)/i)) {
            console.log('ZipRecruiter: Found rating section, skipping:', line);
            continue; // Skip this line and keep looking for job description
        }
        
        // Also look for job description headers that might appear before "posted X days ago"
        if (startLine === -1 && (
            line.toLowerCase().includes('job description') ||
            line.toLowerCase().includes('overview:') ||
            line.toLowerCase().includes('summary:') ||
            line.toLowerCase().includes('title:') ||
            line.toLowerCase().includes('position:') ||
            line.toLowerCase().includes('role:')
        )) {
            startLine = i;
            continue;
        }
        
        // Look for the end of job description - be more comprehensive
        // Don't stop at the first "Report" button, look for actual end markers
        if (startLine !== -1 && endLine === -1) {
            // Look for end markers that indicate the job description is complete
            // But be more careful about stopping too early - we want to include disclaimer text
            if (line.toLowerCase().includes('salary range minimum') ||
                line.toLowerCase().includes('salary range maximum') ||
                line.toLowerCase().includes('equal employment opportunities') ||
                line.toLowerCase().includes('this job description is intended') ||
                // Only stop at "Working at Spectrum" if it's clearly a new section header
                (line.toLowerCase().includes('working at') && line.toLowerCase().includes('spectrum') && 
                 line.length < 50 && i > startLine + 80) ||
                // Only stop at "About Empire" if it's clearly a new section header
                (line.toLowerCase().includes('about') && line.toLowerCase().includes('empire') && 
                 line.length < 50 && i > startLine + 80) ||
                // Only stop at footer content that's clearly not part of the job description
                (line.toLowerCase().includes('ziprecruiter') && line.toLowerCase().includes('inc')) ||
                (line.toLowerCase().includes('privacy policy') && line.toLowerCase().includes('terms')) ||
                (line.toLowerCase().includes('terms of use') && line.toLowerCase().includes('cookie')) ||
                // Only consider Report button if we've gone far enough and it's clearly just a button
                (line.toLowerCase().includes('report') && line.length < 20 && i > startLine + 80)) {
                endLine = i;
                break;
            }
        }
    }
    
    // If we didn't find a start marker, try to find a reasonable starting point
    if (startLine === -1) {
        // Look for patterns that indicate the start of job description
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip rating sections in fallback detection too
            if (line.toLowerCase().includes('rating') ||
                line.toLowerCase().includes('stars') ||
                line.toLowerCase().includes('out of 5') ||
                line.toLowerCase().includes('employee rating') ||
                line.toLowerCase().includes('company rating') ||
                line.toLowerCase().includes('workplace rating') ||
                line.toLowerCase().includes('culture rating') ||
                line.toLowerCase().includes('benefits rating') ||
                line.toLowerCase().includes('career growth') ||
                line.toLowerCase().includes('work-life balance') ||
                line.toLowerCase().includes('management') ||
                line.toLowerCase().includes('compensation') ||
                line.toLowerCase().includes('job security') ||
                line.toLowerCase().includes('overall rating') ||
                line.match(/\d+\.\d+\s*(out of|out of 5|\/5)/i) ||
                line.match(/\d+%\s*(recommend|approve|satisfied)/i)) {
                continue; // Skip rating sections
            }
            
            // Look for job-related content that indicates the start
            if (line.length > 20 && (
                line.toLowerCase().includes('looking for') ||
                line.toLowerCase().includes('seeking') ||
                line.toLowerCase().includes('hiring') ||
                line.toLowerCase().includes('position') ||
                line.toLowerCase().includes('role') ||
                line.toLowerCase().includes('job') ||
                line.toLowerCase().includes('opportunity')
            )) {
                startLine = i;
                break;
            }
        }
    }
    
    // If we didn't find an end marker, try to find a reasonable cutoff point
    if (startLine !== -1 && endLine === -1) {
        // Look for patterns that indicate the end of job description
        // But be more conservative to avoid cutting off disclaimer text
        for (let i = startLine + 50; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for footer-like content or company info that's clearly not part of job description
            // Be more specific to avoid cutting off disclaimer text
            if (line.match(/^\d{4}$/) || // Just a year
                line.match(/^\d{1,4} - \d{1,4} Employees$/) || // Employee count
                line.match(/^[A-Za-z\s]+, [A-Z]{2}, [A-Z]{2}$/) || // Location format
                // Only stop at "Working at" if it's clearly a section header (short line)
                (line.toLowerCase().includes('working at') && line.length < 50) ||
                // Only stop at "About" if it's clearly a section header (short line)
                (line.toLowerCase().includes('about') && line.length < 50) ||
                // Only stop at footer content that's clearly not part of the job description
                (line.toLowerCase().includes('ziprecruiter') && line.toLowerCase().includes('inc')) ||
                (line.toLowerCase().includes('privacy policy') && line.toLowerCase().includes('terms')) ||
                (line.toLowerCase().includes('terms of use') && line.toLowerCase().includes('cookie')) ||
                (line.toLowerCase().includes('cookie policy') && line.toLowerCase().includes('attribution')) ||
                (line.toLowerCase().includes('attribution notices') && line.toLowerCase().includes('corporate')) ||
                (line.toLowerCase().includes('corporate responsibility') && line.toLowerCase().includes('security')) ||
                (line.toLowerCase().includes('security and compliance') && line.toLowerCase().includes('all rights'))) {
                endLine = i;
                break;
            }
        }
        
        // If still no end found, use a more generous default to include disclaimer text
        if (endLine === -1) {
            endLine = Math.min(startLine + 200, lines.length - 1); // Increased from 120 to 200 to include disclaimer text
        }
    }
    
    // If we found boundaries, extract the content
    if (startLine !== -1 && endLine !== -1 && endLine > startLine) {
        const jobDescLines = lines.slice(startLine, endLine);
        let cleanedText = jobDescLines.join('\n').trim();
        
        // Clean up any remaining unwanted content
        cleanedText = cleanedText.replace(/^[^\w]*/, ''); // Remove leading non-word characters
        
        // Additional cleanup: remove any lines that look like company info at the end
        // But be more conservative to preserve disclaimer text
        const finalLines = cleanedText.split('\n');
        const filteredLines = [];
        
        for (let i = 0; i < finalLines.length; i++) {
            const line = finalLines[i].trim();
            
            // Skip lines that look like company information
            // But be more specific to avoid removing disclaimer text
            if (line.match(/^\d{4}$/) || // Just a year
                line.match(/^\d{1,4} - \d{1,4} Employees$/) || // Employee count
                line.match(/^[A-Za-z\s]+, [A-Z]{2}, [A-Z]{2}$/) || // Location format
                // Only remove very short company names (not disclaimer text)
                (line.match(/^[A-Za-z\s]+$/) && line.length < 20 && 
                 !line.toLowerCase().includes('earning range') &&
                 !line.toLowerCase().includes('sales') &&
                 !line.toLowerCase().includes('insurance') &&
                 !line.toLowerCase().includes('cslb') &&
                 !line.toLowerCase().includes('https://'))) {
                continue;
            }
            
            filteredLines.push(line);
        }
        
        cleanedText = filteredLines.join('\n').trim();
        
        console.log('ZipRecruiter: Extracted job description using improved boundary detection');
        console.log('ZipRecruiter: Start line:', startLine, 'End line:', endLine, 'Total lines extracted:', endLine - startLine);
        return cleanedText;
    }
    
    // Fallback: if we can't find the marker, try to find job description content
    const jobDescMarkers = [
        "Title:",
        "Job description",
        "Requirements:",
        "What's in it for you:",
        "About ",
        "Do you have a passion",
        "As a ",
        "You will be",
        "You'll be"
    ];
    
    for (const marker of jobDescMarkers) {
        const index = text.indexOf(marker);
        if (index !== -1) {
            let cleanedText = text.substring(index).trim();
            
            // Remove sections that are not part of the job description
            const unwantedSections = [
                'Working at',
                'Breakroom',
                'Most people',
                'Powered by real frontline workers',
                'Get the real story',
                'Learn more',
                'Report',
                'Apply',
                'Save job',
                '1-click apply',
                'Job search',
                'Browse jobs',
                'Filter',
                'Sort by',
                'Page',
                'Results',
                'Showing',
                'Job Seekers',
                'Small & Medium Businesses',
                'Enterprise Businesses',
                'Partner with Us',
                'Company',
                'Privacy Policy',
                'California Privacy Notice',
                'Terms of Use',
                'Cookie Policy',
                'Attribution Notices',
                'Corporate Responsibility',
                'Security and Compliance',
                'ZipRecruiter, Inc.',
                'All Rights Reserved',
                'View All',
                'Jobs',
                'Industry',
                'Company size',
                'Headquarters location',
                'Year founded',
                'Website',
                'Social media',
                'Earning range based on average',
                'Sales (except CA, UT, MA and AZ)',
                'Insurance Options offered through',
                'CSLB',
                'https://',
                'www.',
                '.com',
                // Rating system sections
                'Employee Rating',
                'Company Rating',
                'Workplace Rating',
                'Culture Rating',
                'Benefits Rating',
                'Career Growth',
                'Work-Life Balance',
                'Management',
                'Compensation',
                'Job Security',
                'Overall Rating',
                'out of 5',
                'stars',
                'recommend',
                'approve',
                'satisfied'
            ];
            
            // Remove unwanted sections
            for (const section of unwantedSections) {
                const regex = new RegExp(`.*${section}.*?(?=\\n|$|\\n\\n)`, 'gi');
                cleanedText = cleanedText.replace(regex, '');
            }
            
            // Special handling: preserve disclaimer text that might be incorrectly removed
            // Look for and restore disclaimer text that was accidentally removed
            const disclaimerPatterns = [
                /Earning range based on average and top earners\./i,
                /Sales \(except CA, UT, MA and AZ\) and installation provided by independent contractors\./i,
                /Insurance Options offered through unaffiliated third parties\./i,
                /CSLB \d+\./i,
                /https:\/\/www\.empiretoday\.com\/about-empire\/licensing\./i,
                /https:\/\/www\.empiretoday\.com\/about-empire\/privacy-policy\./i
            ];
            
            // Check if any disclaimer text is missing and restore it
            const originalText = text.substring(index);
            for (const pattern of disclaimerPatterns) {
                if (pattern.test(originalText) && !pattern.test(cleanedText)) {
                    // Find the disclaimer text in the original and append it
                    const match = originalText.match(pattern);
                    if (match) {
                        cleanedText += '\n' + match[0];
                    }
                }
            }
            
            // Remove job listing patterns
            cleanedText = cleanedText.replace(/\$[\d,]+K?\/[a-z]+/gi, '');
            cleanedText = cleanedText.replace(/[A-Za-z\s]+, [A-Z]{2}\s*[•·]\s*[A-Za-z\-\s]+/g, '');
            cleanedText = cleanedText.replace(/Full-time|Part-time|Contractor|Temporary/gi, '');
            
            // Remove multiple newlines and clean up spacing
            cleanedText = cleanedText.replace(/\n\s*\n/g, '\n\n').trim();
            
            return cleanedText;
        }
    }
    
    // If we still can't find anything, return the original text but cleaned
    return text.trim();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received from popup:', request);
    
    if (request.action === 'extractJobDescription') {
        console.log('🔍 Extracting job description...');
        
        const jobText = extractJobText();
        console.log('📄 Extraction result:', jobText ? `Found ${jobText.length} characters` : 'No text found');
        
        if (jobText) {
            console.log('✅ Sending job text back to popup');
            const tabTitle = document.title || 'Job Posting';
            sendResponse({ jobText, tabTitle });
        } else {
            console.log('❌ No job text found, sending empty response');
            sendResponse({ jobText: null, error: 'No job description found on this page. Please make sure you\'re looking at a job posting.' });
        }
    } else {
        console.log('❓ Unknown action:', request.action);
        sendResponse({ error: 'Unknown action' });
    }
});

// Content script loaded successfully
console.log('✅ JobTaylor content script fully loaded and ready');
  