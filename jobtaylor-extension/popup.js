// popup.js

// Authentication state
let auth = null;
let isAuthenticated = false;
let currentUser = null;

// PDF Service Configuration
const PDF_SERVICE_URL = 'https://pdf-service2-5xlwxkuud-avidshotzs-projects.vercel.app/api/success';

// PDF generation function using Vercel service
async function generatePDFFromHTML(htmlContent, filename = 'document.pdf') {
    try {
        console.log('🚀 Calling PDF service with HTML length:', htmlContent.length);
        
        // Check HTML size and warn if too large
        const htmlBytes = new Blob([htmlContent]).size;
        const htmlKB = (htmlBytes / 1024).toFixed(1);
        console.log('📊 HTML content size:', htmlKB, 'KB');
        
        if (htmlBytes > 100 * 1024) { // 100KB limit
            console.warn('⚠️ HTML content is quite large:', htmlKB, 'KB - this might cause issues');
        }
        
        // Create the payload and check its size
        const payload = { html: htmlContent };
        const payloadStr = JSON.stringify(payload);
        const payloadBytes = new Blob([payloadStr]).size;
        const payloadKB = (payloadBytes / 1024).toFixed(1);
        
        console.log('📦 JSON payload size:', payloadKB, 'KB');
        
        if (payloadBytes > 200 * 1024) { // 200KB limit
            throw new Error(`HTML content too large for PDF service (${payloadKB}KB). Try reducing the content size.`);
        }
        
        const response = await fetch(PDF_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr
        });

        console.log('📡 PDF service response:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ PDF service error:', errorText);
            throw new Error(`PDF generation failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const pdfBlob = await response.blob();
        console.log('✅ PDF generated successfully, size:', (pdfBlob.size / 1024).toFixed(1), 'KB');
        
        // Convert to base64 for storage
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function() {
                const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
        });
    } catch (error) {
        console.error('💥 PDF generation error:', error);
        throw error;
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    initAuth();
});

// Initialize authentication
async function initAuth() {
    try {
        console.log('🔧 Initializing authentication...');
        
        // Try to get RezlieAuth from window object first (since auth.js is loaded as script)
        let RezlieAuth = window.RezlieAuth;
        
        if (!RezlieAuth) {
            console.log('⚠️ RezlieAuth not found on window, trying ES6 import...');
            try {
                const module = await import('./auth.js');
                console.log('🔍 Imported module:', module);
                RezlieAuth = module.RezlieAuth;
                console.log('🔍 RezlieAuth from module:', RezlieAuth);
                console.log('✅ RezlieAuth imported successfully via ES6 import');
            } catch (importError) {
                console.error('❌ ES6 import also failed:', importError);
                throw new Error('RezlieAuth not available');
            }
        } else {
            console.log('✅ RezlieAuth found on window object');
            console.log('🔍 RezlieAuth from window:', RezlieAuth);
        }
        
        if (typeof RezlieAuth !== 'function') {
            throw new Error('RezlieAuth is not a constructor function');
        }
        
        auth = new RezlieAuth();
        console.log('✅ Auth instance created');
        
        // Check authentication status
        isAuthenticated = await auth.isAuthenticated();
        console.log('🔍 Authentication status:', isAuthenticated);
        
        currentUser = await auth.getCurrentUser();
        console.log('👤 Current user:', currentUser);
        
        // Update UI based on auth state
        updateAuthUI();
        console.log('🎨 UI updated');
        
        // Listen for auth state changes
        auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'User logged in' : 'User logged out');
            isAuthenticated = !!session;
            currentUser = session?.user || null;
            updateAuthUI();
        });
        
        console.log('✅ Authentication initialization complete');
        
        // Check for existing PDFs and update download button state
        checkExistingPDFs();
        
    } catch (error) {
        console.error('❌ Failed to initialize authentication:', error);
    }
}

// Update UI based on authentication state
function updateAuthUI() {
    const authStatus = document.getElementById('authStatus');
    const authButton = document.getElementById('authButton');
    const rateLimitInfo = document.getElementById('rateLimitInfo');
    const userInfoBtn = document.getElementById('userInfoBtn');
    
    if (authStatus) {
        if (isAuthenticated) {
            authStatus.textContent = `Logged in as: ${currentUser?.email || 'User'}`;
            authStatus.className = 'auth-status logged-in';
        } else {
            authStatus.textContent = 'Not logged in';
            authStatus.className = 'auth-status logged-out';
        }
    }
    
    if (authButton) {
        if (isAuthenticated) {
            authButton.textContent = 'Sign Out';
            authButton.onclick = signOut;
        } else {
            authButton.textContent = 'Sign In';
            authButton.onclick = showSignInModal;
        }
    }
    
    // Update user info button
    updateUserInfoButton();
    
    // Update rate limit info
    updateRateLimitInfo();
}

// Show sign in modal
function showSignInModal() {
    console.log('🔧 showSignInModal called');
    
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
                    <h3>Sign In to Rezlie</h3>
        <p>Sign in to get unlimited resume generations and save your work.</p>
            <form id="signInForm">
                <input type="email" id="signInEmail" placeholder="Email" required>
                <input type="password" id="signInPassword" placeholder="Password" required>
                <button type="submit">Sign In</button>
                <button type="button" id="createAccountBtn">Create Account</button>
            </form>
            <button class="close-modal" id="closeModalBtn">×</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('✅ Modal added to DOM');
    
    // Add event listeners after DOM is created
    document.getElementById('createAccountBtn').addEventListener('click', showSignUpForm);
    document.getElementById('closeModalBtn').addEventListener('click', closeAuthModal);
    
    // Handle sign in form
    document.getElementById('signInForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signInEmail').value;
        const password = document.getElementById('signInPassword').value;
        
        try {
            const result = await auth.signIn(email, password);
            console.log('✅ Sign in successful:', result);
            
            // Update authentication state
            isAuthenticated = true;
            currentUser = result.user;
            
            // Trigger auth state change
            auth.triggerAuthStateChange('SIGNED_IN', result);
            
            closeAuthModal();
        } catch (error) {
            alert('Sign in failed: ' + error.message);
        }
    });
}

// Show sign up form
function showSignUpForm() {
    const modal = document.querySelector('.auth-modal-content');
    modal.innerHTML = `
        <h3>Create Account</h3>
        <p>Create a new account to get started with Rezlie.</p>
        <form id="signUpForm">
            <input type="email" id="signUpEmail" placeholder="Email" required>
            <input type="password" id="signUpPassword" placeholder="Password" required>
            <button type="submit">Create Account</button>
            <button type="button" id="backToSignInBtn">Back to Sign In</button>
        </form>
        <button class="close-modal" id="closeModalBtn2">×</button>
    `;
    
    // Add event listeners after DOM is created
    document.getElementById('backToSignInBtn').addEventListener('click', showSignInModal);
    document.getElementById('closeModalBtn2').addEventListener('click', closeAuthModal);
    
    // Handle sign up form
    document.getElementById('signUpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        
        try {
            const result = await auth.signUp(email, password);
            console.log('✅ Sign up successful:', result);
            
            if (result.requiresEmailConfirmation) {
                // Show email confirmation message with more details
                alert('Account created! Please check your email to verify your account. After verification, you can sign in to use Rezlie.');
                closeAuthModal();
            } else if (result.user && result.session) {
                // Auto-sign in if email is already confirmed
                isAuthenticated = true;
                currentUser = result.user;
                auth.triggerAuthStateChange('SIGNED_IN', result);
                alert('Account created and signed in successfully!');
                closeAuthModal();
            } else if (result.user) {
                // User created but needs email verification
                alert('Account created! Please check your email to verify your account. You can sign in after verification.');
                closeAuthModal();
            } else {
                alert('Account created! Please check your email to verify your account.');
                closeAuthModal();
            }
        } catch (error) {
            console.error('Sign up error:', error);
            alert('Sign up failed: ' + error.message);
        }
    });
}

// Close auth modal
function closeAuthModal() {
    const modal = document.querySelector('.auth-modal');
    if (modal) {
        modal.remove();
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
        
        // Update authentication state
        isAuthenticated = false;
        currentUser = null;
        
        // Trigger auth state change
        auth.triggerAuthStateChange('SIGNED_OUT', null);
        
        console.log('✅ Sign out successful');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// Update user info button
async function updateUserInfoButton() {
    const userInfoBtn = document.getElementById('userInfoBtn');
    if (!userInfoBtn) return;
    
    if (isAuthenticated && currentUser) {
        userInfoBtn.style.display = 'flex';
        
        // Update email
        const emailSpan = userInfoBtn.querySelector('.user-email');
        if (emailSpan) {
            emailSpan.textContent = currentUser.email || 'Unknown';
        }
        
        // Get rate limit info for credits
        try {
            const rateLimitInfo = await auth.getRateLimitInfo();
            const creditsSpan = userInfoBtn.querySelector('.user-credits');
            const subscriptionSpan = userInfoBtn.querySelector('.user-subscription');
            
            if (rateLimitInfo) {
                // Calculate remaining the same way as the gray text below
                const used = rateLimitInfo.monthly_generations || 0;
                const total = 10;
                const remaining = Math.max(0, total - used);
                if (creditsSpan) {
                    creditsSpan.textContent = `Credits: ${remaining}`;
                }
                
                if (subscriptionSpan) {
                    subscriptionSpan.textContent = rateLimitInfo.is_paying_user ? 'Pro' : 'Free';
                }
            } else {
                if (creditsSpan) {
                    creditsSpan.textContent = 'Credits: --';
                }
                if (subscriptionSpan) {
                    subscriptionSpan.textContent = 'Free';
                }
            }
        } catch (error) {
            console.error('Error getting rate limit info for user button:', error);
            const creditsSpan = userInfoBtn.querySelector('.user-credits');
            const subscriptionSpan = userInfoBtn.querySelector('.user-subscription');
            if (creditsSpan) creditsSpan.textContent = 'Credits: --';
            if (subscriptionSpan) subscriptionSpan.textContent = 'Free';
        }
    } else {
        userInfoBtn.style.display = 'none';
    }
}

// Update rate limit info
async function updateRateLimitInfo() {
    const rateLimitInfo = document.getElementById('rateLimitInfo');
    if (!rateLimitInfo) return;
    
    try {
        if (isAuthenticated) {
            const rateLimitData = await auth.getRateLimitInfo();
            if (rateLimitData) {
                rateLimitInfo.textContent = `Monthly generations: ${rateLimitData.monthly_generations || 0} of 10`;
            } else {
                rateLimitInfo.textContent = 'Monthly generations: 0 of 10';
            }
        } else {
            rateLimitInfo.textContent = 'Sign in to start generating resumes';
        }
    } catch (error) {
        console.error('Error updating rate limit info:', error);
        rateLimitInfo.textContent = 'Rate limit info unavailable';
    }
}

// Load Resume function
function showLoadResume() {
    console.log('=== showLoadResume function called ===');
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.doc,.docx,.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'hiddenFileInput';
    fileInput.name = 'resumeFile';
    
    // Add event listener for file selection
    fileInput.addEventListener('change', function(e) {
        console.log('File selected:', e.target.files[0]);
        if (e.target.files[0]) {
            processLoadedResume(e.target.files[0]);
        }
    });
    
    // Add to DOM temporarily
    document.body.appendChild(fileInput);
    
    // Trigger file selection dialog
    try {
        fileInput.click();
        console.log('File dialog triggered');
    } catch (error) {
        console.error('Error triggering file dialog:', error);
        alert('Error opening file dialog. Please try again.');
    }
    
    // Clean up after a delay
    setTimeout(() => {
        if (document.getElementById('hiddenFileInput')) {
            document.body.removeChild(fileInput);
        }
    }, 1000);
}

window.onload = function () {
    console.log('Window loaded, setting up extension...');
    
    // Load saved data on startup
    loadSavedData();
    
    // Set up event listeners with a small delay to ensure DOM is ready
    setTimeout(() => {
        setupEventListeners();
    }, 50);
    
    // Fallback: try to set up load resume button again after a longer delay
    setTimeout(() => {
        const loadBtn = document.getElementById('loadResumeBtn');
        if (loadBtn && !loadBtn.hasAttribute('data-listener-attached')) {
            console.log('Adding fallback event listener to Load Resume button');
            loadBtn.setAttribute('data-listener-attached', 'true');
            loadBtn.addEventListener('click', showLoadResume);
        }
    }, 200);
};

async function loadSavedData() {
    try {
        const result = await chrome.storage.local.get([
            'jobText', 
            'tailoredResume', 
            'coverLetter', 
            'selectedResumeId',
            'resumeHistory',
            'userResumes',
            'currentResumeIndex'
        ]);
        
        // Load job description
        if (result.jobText) {
            document.getElementById('jobDesc').value = result.jobText;
        }
        
        // Initialize user resumes if not exists
        if (!result.userResumes) {
            await chrome.storage.local.set({
                userResumes: [
                    { id: 'resume-1', name: 'Professional Resume', content: '', experience: '' },
                    { id: 'resume-2', name: 'Technical Resume', content: '', experience: '' },
                    { id: 'resume-3', name: 'Creative Resume', content: '', experience: '' },
                    { id: 'resume-4', name: 'Custom Resume', content: '', experience: '' }
                ],
                currentResumeIndex: 0
            });
        }
        
        // Load selected resume
        if (result.selectedResumeId) {
            document.getElementById('resumeSelect').value = result.selectedResumeId;
        }
        
        // Load last generated content
        if (result.tailoredResume) {
            updateOutputDisplay('resume', result.tailoredResume);
        }
        
        if (result.coverLetter) {
            updateOutputDisplay('cover', result.coverLetter);
        }
        
        // Update UI state
        updateButtonStates();
        updateResumeSelector();
        
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Helper function to safely add event listeners
    function addEventListenerSafely(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`Adding event listener to ${elementId}`);
            element.addEventListener(event, handler);
        } else {
            console.error(`Element ${elementId} not found!`);
        }
    }
    
    // Generate button
    addEventListenerSafely('generateBtn', 'click', handleGenerate);
    
    // Resume selection change
    const resumeSelect = document.getElementById('resumeSelect');
    if (resumeSelect) {
        resumeSelect.addEventListener('change', (e) => {
            chrome.storage.local.set({ selectedResumeId: e.target.value });
            loadSelectedResumeContent();
        });
    }
    
    // Add resume management buttons
    addEventListenerSafely('manageResumesBtn', 'click', showResumeManager);
    // Note: saveResumeBtn is created dynamically, so we'll add its listener when it's created
    
    // Add load resume button if it exists
    const loadBtn = document.getElementById('loadResumeBtn');
    if (loadBtn) {
        console.log('Load Resume button found, adding event listener');
        loadBtn.addEventListener('click', function(e) {
            console.log('Load Resume button clicked - event listener triggered!');
            e.preventDefault();
            showLoadResume();
        });
    } else {
        console.error('Load Resume button not found!');
    }
    
    // Add extract job description button if it exists
    const extractBtn = document.getElementById('extractJobBtn');
    if (extractBtn) {
        console.log('Extract Job button found, adding event listener');
        extractBtn.addEventListener('click', extractJobFromCurrentPage);
    }
    
    console.log('Event listeners setup complete');
}

function updateResumeSelector() {
    chrome.storage.local.get(['userResumes'], (result) => {
        const select = document.getElementById('resumeSelect');
        const resumes = result.userResumes || [];
        
        // Clear existing options
        select.innerHTML = '';
        
        resumes.forEach((resume, index) => {
            const option = document.createElement('option');
            option.value = resume.id;
            option.textContent = `${resume.name} ${resume.content ? '(Saved)' : '(Empty)'}`;
            select.appendChild(option);
        });
    });
}

async function loadSelectedResumeContent() {
    const selectedId = document.getElementById('resumeSelect').value;
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    
    const selectedResume = resumes.find(r => r.id === selectedId);
    if (selectedResume) {
        // Update the user pitch display area
        const resumeContentArea = document.getElementById('resumeContent');
        if (resumeContentArea) {
            resumeContentArea.value = selectedResume.content || ''; // REFACTORED: This now contains the user's pitch
        }
        
        // Update experience area
        const experienceArea = document.getElementById('experienceContent');
        if (experienceArea) {
            experienceArea.value = selectedResume.experience || '';
        }
    }
}

async function saveCurrentResume() { // REFACTORED: Function name kept for compatibility, but now saves user pitch
    const selectedId = document.getElementById('resumeSelect').value;
    const userPitch = document.getElementById('resumeContent').value; // REFACTORED: Variable renamed to reflect new purpose
    const experienceContent = document.getElementById('experienceContent').value;
    
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    
    const resumeIndex = resumes.findIndex(r => r.id === selectedId);
    if (resumeIndex !== -1) {
        resumes[resumeIndex].content = userPitch; // REFACTORED: Now saves the user's pitch
        resumes[resumeIndex].experience = experienceContent;
        resumes[resumeIndex].lastUpdated = new Date().toISOString();
        
        await chrome.storage.local.set({ userResumes: resumes });
        
        // Show success message
        const outputElement = document.getElementById('output');
        outputElement.innerText = '✅ Resume and pitch saved successfully!'; // REFACTORED: Updated message to reflect new purpose
        setTimeout(() => {
            outputElement.innerText = '';
        }, 2000);
        
        updateResumeSelector();
    }
}

function showResumeManager() {
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = `
        <div class="resume-manager-header">
            <h3>📝 Resume Manager</h3>
            <p>Manage your 4 resume slots with full experience details:</p>
        </div>
        
        <div class="resume-manager-section">
            <label for="resumeContent"><strong>🎯 Make Your Pitch:</strong></label>
            <textarea id="resumeContent" name="resumeContent" placeholder="Tell us how you want to be presented to employers. What makes you unique? What value can you bring? What's your professional story? This helps AI tailor your experience to match the job..."></textarea>
        </div>
        
        <div class="resume-manager-section">
            <label for="experienceContent"><strong>📋 Full Experience Details (for GPT):</strong></label>
            <textarea id="experienceContent" name="experienceContent"
                      placeholder="Include ALL your experience, skills, projects, achievements, certifications, education, etc. This gives GPT maximum context to tailor your resume..."></textarea>
        </div>
        
        <div class="resume-manager-buttons">
            <button id="saveResumeBtn" class="btn btn-success">💾 Save Resume</button>
            <button id="previewResumeBtn" class="btn btn-primary">👁️ Preview Resume</button>
            <button id="closeResumeManagerBtn" class="btn btn-secondary">❌ Close</button>
        </div>
        
        <div class="resume-manager-tip">
            💡 <strong>Tip:</strong> Your pitch helps AI understand your story and value proposition. The more detailed your experience section, the better GPT can select the most relevant jobs and tailor your resume!
        </div>
    `;
    
    // Load current user pitch
    loadSelectedResumeContent();
    
    // Add event listeners for dynamically created buttons
    document.getElementById('saveResumeBtn').addEventListener('click', saveCurrentResume);
    document.getElementById('previewResumeBtn').addEventListener('click', previewCurrentResume);
    document.getElementById('closeResumeManagerBtn').addEventListener('click', clearResumeManager);
}

function clearResumeManager() {
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = '';
}

function previewCurrentResume() { // REFACTORED: Function name kept for compatibility, but now previews user pitch
    const userPitch = document.getElementById('resumeContent').value; // REFACTORED: Variable renamed to reflect new purpose
    const experienceContent = document.getElementById('experienceContent').value;
    const selectedId = document.getElementById('resumeSelect').value;
    
    if (!userPitch.trim() && !experienceContent.trim()) {
        alert('No content to preview. Please add some pitch or experience content first.'); // REFACTORED: Updated message to reflect new purpose
        return;
    }
    
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = `
        <div class="preview-header">
            <h3>👁️ Resume & Pitch Preview</h3> // REFACTORED: Updated header to reflect new purpose
            <p>Selected Resume: ${getResumeNameById(selectedId)}</p>
        </div>
        
        ${userPitch ? `
        <div class="preview-section">
            <h4>🎯 Your Pitch:</h4>
            <div class="preview-content">
                ${userPitch}
            </div>
        </div>
        ` : ''}
        
        ${experienceContent ? `
        <div class="preview-section">
            <h4>📋 Full Experience Details (for GPT):</h4>
            <div class="preview-content">
                ${experienceContent}
            </div>
        </div>
        ` : ''}
        
        <div class="preview-actions">
            <button onclick="showResumeManager()" class="btn btn-secondary">← Back to Editor</button>
            <button onclick="viewAllResumes()" class="btn btn-primary">📋 View All Resumes</button>
        </div>
    `;
}

function getResumeNameById(id) {
    const resumeNames = {
        'resume-1': 'Professional Resume',
        'resume-2': 'Technical Resume', 
        'resume-3': 'Creative Resume',
        'resume-4': 'Custom Resume'
    };
    return resumeNames[id] || 'Unknown Resume';
}

function viewAllResumes() {
    chrome.storage.local.get(['userResumes'], (result) => {
        const resumes = result.userResumes || [];
        const outputElement = document.getElementById('output');
        
        let html = `
            <div class="resume-list-header">
                <h3>📋 All Saved Resumes</h3>
                <p>Click on any resume to view its pitch and experience</p> // REFACTORED: Updated text to reflect new purpose
            </div>
        `;
        
        resumes.forEach((resume, index) => {
            const hasContent = resume.content || resume.experience;
            const lastUpdated = resume.lastUpdated ? new Date(resume.lastUpdated).toLocaleDateString() : 'Never';
            
            html += `
                <div class="resume-item ${hasContent ? 'has-content' : 'empty'}" 
                     onclick="viewSpecificResume('${resume.id}')">
                    <div class="resume-item-content">
                        <div>
                            <h4>${resume.name}</h4>
                            <p>
                                ${hasContent ? '✅ Has content' : '❌ Empty'} • Last updated: ${lastUpdated}
                            </p>
                        </div>
                        <div class="resume-icon">${hasContent ? '📄' : '📭'}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
            <button onclick="showResumeManager()" class="btn btn-secondary">← Back to Editor</button>
        `;
        
        outputElement.innerHTML = html;
    });
}

function viewSpecificResume(resumeId) {
    chrome.storage.local.get(['userResumes'], (result) => {
        const resumes = result.userResumes || [];
        const resume = resumes.find(r => r.id === resumeId);
        
        if (!resume) {
            alert('Resume not found!');
            return;
        }
        
        const outputElement = document.getElementById('output');
        const lastUpdated = resume.lastUpdated ? new Date(resume.lastUpdated).toLocaleString() : 'Never';
        
        let html = `
            <div class="resume-detail-header">
                <h3>📄 ${resume.name}</h3>
                <p>Last updated: ${lastUpdated}</p>
            </div>
        `;
        
        if (resume.content) {
            html += `
                <div class="resume-detail-section">
                    <h4>🎯 User Pitch:</h4> // REFACTORED: Updated header to reflect new purpose
                    <div class="resume-detail-content">
                        ${resume.content}
                    </div>
                </div>
            `;
        }
        
        if (resume.experience) {
            html += `
                <div class="resume-detail-section">
                    <h4>📋 Experience Details:</h4>
                    <div class="resume-detail-content">
                        ${resume.experience}
                    </div>
                </div>
            `;
        }
        
        if (!resume.content && !resume.experience) {
            html += `
                <div class="resume-empty-message">
                    <p>❌ This resume has no pitch or experience saved yet.</p> // REFACTORED: Updated text to reflect new purpose
                </div>
            `;
        }
        
        html += `
            <div class="resume-detail-actions">
                <button onclick="selectResume('${resumeId}')" class="btn btn-success">✅ Select This Resume</button>
                <button onclick="viewAllResumes()" class="btn btn-secondary">← Back to All Resumes</button>
                <button onclick="showResumeManager()" class="btn btn-primary">📝 Edit Resumes</button>
            </div>
        `;
        
        outputElement.innerHTML = html;
    });
}

function selectResume(resumeId) {
    document.getElementById('resumeSelect').value = resumeId;
    chrome.storage.local.set({ selectedResumeId: resumeId });
    
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = `
        <div class="success-message">
            <p>✅ Resume selected successfully!</p>
        </div>
        <button onclick="showResumeManager()" class="btn btn-secondary">← Back to Editor</button>
    `;
    
    updateResumeSelector();
}

function processLoadedResume(file) {
    console.log('Processing file:', file.name, 'Type:', file.type);
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            let resumeContent = e.target.result;
            console.log('File content length:', resumeContent.length);
            
            // Basic text extraction (for now - could be enhanced for PDF/DOC parsing)
            if (file.type === 'application/pdf') {
                // For PDFs, we'd need a PDF parser library
                alert('PDF parsing is not yet supported. Please convert to .txt or .doc format.');
                return;
            }
            
            // Get the currently selected resume slot
            const currentSlotId = document.getElementById('resumeSelect').value;
            
            // Save the user pitch to the current slot
            const result = await chrome.storage.local.get(['userResumes']);
            const resumes = result.userResumes || [];
            
            const resumeIndex = resumes.findIndex(r => r.id === currentSlotId);
            if (resumeIndex !== -1) {
                resumes[resumeIndex].content = resumeContent; // REFACTORED: This now contains the user's pitch
                resumes[resumeIndex].lastUpdated = new Date().toISOString();
                resumes[resumeIndex].loadedFrom = file.name;
                
                await chrome.storage.local.set({ userResumes: resumes });
                
                // Show success message
                const outputElement = document.getElementById('output');
                outputElement.innerHTML = `
                    <div class="success-message">
                        <p>✅ Resume and pitch loaded successfully!</p> // REFACTORED: Updated message to reflect new purpose
                        <p>File: ${file.name}<br>
                        Slot: ${getResumeNameById(currentSlotId)}<br>
                        Content length: ${resumeContent.length} characters</p>
                    </div>
                    <div class="load-actions">
                        <button onclick="showResumeManager()" class="btn btn-success">📝 Manage Resumes</button>
                        <button onclick="clearLoadResume()" class="btn btn-secondary">❌ Close</button>
                    </div>
                `;
                
                // Update the resume selector
                updateResumeSelector();
                
            } else {
                throw new Error('Resume slot not found');
            }
            
        } catch (error) {
            console.error('Error processing loaded resume:', error);
            alert('Error processing the loaded file. Please try again.');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
}

function clearLoadResume() {
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = '';
}

async function extractJobFromCurrentPage() {
    const outputElement = document.getElementById('output');
    outputElement.innerText = 'Extracting job description from current page...';
    
    try {
        console.log('🔍 Starting job description extraction...');
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('❌ Could not access current tab');
            outputElement.innerText = 'Error: Could not access current tab.';
            return;
        }
        
        console.log('📄 Current tab:', tab.url);
        
        // Check if we're on a supported job site
        const supportedSites = [
            'linkedin.com', 'indeed.com', 'glassdoor.com', 
            'monster.com', 'careerbuilder.com', 'ziprecruiter.com', 
            'simplyhired.com'
        ];
        
        const isJobSite = supportedSites.some(site => tab.url.includes(site));
        
        if (!isJobSite) {
            console.log('⚠️ Not on a supported job site, but will try extraction anyway');
            outputElement.innerText = 'Not on a supported job site, but trying extraction anyway...';
        } else {
            console.log('✅ On a supported job site');
        }
        
        // Execute content script to extract job description
        console.log('📨 Sending message to content script...');
        
        let results;
        try {
            results = await chrome.tabs.sendMessage(tab.id, { action: 'extractJobDescription' });
        } catch (error) {
            console.log('❌ Content script not available, trying to inject manually...');
            
            // Try to inject the content script manually
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                
                // Wait a moment for the script to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try the message again
                results = await chrome.tabs.sendMessage(tab.id, { action: 'extractJobDescription' });
                console.log('✅ Manual injection successful');
            } catch (injectionError) {
                console.error('❌ Manual injection failed:', injectionError);
                throw new Error('Content script could not be loaded. Please refresh the page and try again.');
            }
        }
        
        console.log('📨 Response from content script:', results);
        
        if (results && results.jobText) {
            console.log('✅ Job description extracted successfully');
            console.log('📄 Job text length:', results.jobText.length);
            console.log('📄 Job text preview:', results.jobText.substring(0, 200) + '...');
            console.log('📄 Tab title:', results.tabTitle || 'No title');
            
            // Update the job description textarea
            const jobDescTextarea = document.getElementById('jobDesc');
            if (jobDescTextarea) {
                jobDescTextarea.value = results.jobText;
                console.log('✅ Updated job description textarea');
            } else {
                console.error('❌ Could not find jobDesc textarea');
            }
            
            // Save to storage
            await chrome.storage.local.set({ 
                jobText: results.jobText,
                tabTitle: results.tabTitle || 'Job Posting'
            });
            console.log('✅ Saved job text and tab title to storage');
            
            outputElement.innerText = `✅ Job description extracted successfully!\n\nLength: ${results.jobText.length} characters\n\nYou can now generate tailored recommendations.`;
            
            // Clear the message after 3 seconds
            setTimeout(() => {
                outputElement.innerText = '';
            }, 3000);
            
        } else if (results && results.error) {
            outputElement.innerText = `Error: ${results.error}`;
            console.log('❌ Content script error:', results.error);
        } else {
            console.log('❌ No job description found in response');
            console.log('📄 Full response:', results);
            outputElement.innerText = 'No job description found on this page. Please make sure you\'re on a job posting page.\n\n💡 Try:\n• Refreshing the page\n• Scrolling down to load more content\n• Making sure you\'re on a job detail page, not a search results page';
        }
        
    } catch (error) {
        console.error('❌ Error extracting job description:', error);
        
        if (error.message.includes('Could not establish connection')) {
            outputElement.innerText = 'Error: Content script not available. Please refresh the page and try again.';
        } else {
            outputElement.innerText = `Error extracting job description: ${error.message}\n\nPlease refresh the page and try again.`;
        }
    }
}

async function handleGenerate() {
    const jobDescription = document.getElementById('jobDesc').value;
    const selectedResumeId = document.getElementById('resumeSelect').value;
    const outputElement = document.getElementById('output');
    const generateBtn = document.getElementById('generateBtn');
    
    if (!jobDescription.trim()) {
        outputElement.innerText = 'Please enter a job description first.\n\n💡 Tip: Click "Extract Job" to automatically extract job descriptions from job posting pages (LinkedIn, Indeed, Glassdoor, etc.)';
        return;
    }
    
    // Get the selected user pitch
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    
    if (!selectedResume || (!selectedResume.content && !selectedResume.experience)) {
        outputElement.innerText = 'Please save a resume first using the "Manage Resumes" button.';
        return;
    }
    
    // Check if job description looks like navigation content and show warning (but don't block)
    const navigationKeywords = ['search', 'browse', 'post a job', 'employer', 'job seeker', 'career advice', 'mobile apps', 'trust and safety', 'support', 'about us', 'careers', 'investors', 'blog', 'press'];
    const isLikelyNavigation = navigationKeywords.some(keyword => 
        jobDescription.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (isLikelyNavigation) {
        // Show warning with option to proceed
        outputElement.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Warning</h4>
                <p style="margin: 0 0 15px 0; color: #856404;">
                    The job description appears to be navigation content rather than an actual job posting. 
                    This might result in generic recommendations.
                </p>
                <p style="margin: 0 0 15px 0; color: #856404;">
                    <strong>For best results:</strong> Use an actual job description from a job posting page.
                </p>
                <button id="proceedBtn" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    Proceed Anyway
                </button>
                <button id="cancelBtn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        // Add event listeners to the buttons
        document.getElementById('proceedBtn').addEventListener('click', proceedWithNavigationContent);
        document.getElementById('cancelBtn').addEventListener('click', clearOutput);
        
        return;
    }
    
    // Log the plaintext content being sent to OpenAI
    console.log('=== PLAINTEXT CONTENT FOR OPENAI ===');
    console.log('📄 Job Description:', jobDescription);
    console.log('🎯 User Pitch:', selectedResume.content); // REFACTORED: Updated log message to reflect new purpose
    console.log('📋 Full Experience Details:', selectedResume.experience);
    console.log('📂 Resume Name:', selectedResume.name);
    console.log('🆔 Resume ID:', selectedResumeId);
    console.log('👤 User ID:', 'demo-user');
    
    // Get tab title from storage
    const storageResult = await chrome.storage.local.get(['tabTitle']);
    const tabTitle = storageResult.tabTitle || 'Job Posting';
    
    // Create the complete package being sent to OpenAI API
    const openAIPackage = {
        jobDescription,
        resumeId: selectedResumeId,
        userId: 'demo-user',
        userPitch: selectedResume.content, // REFACTORED: Changed from currentResume to userPitch - this is now the user's personal pitch/story
        fullExperience: selectedResume.experience,
        resumeName: selectedResume.name,
        tabTitle
    };
    
    console.log('=== COMPLETE PACKAGE SENT TO OPENAI API ===');
    console.log('📦 API Package:', JSON.stringify(openAIPackage, null, 2));
    console.log('📊 Package Size:', JSON.stringify(openAIPackage).length, 'characters');
    console.log('📊 Job Description Length:', jobDescription.length, 'characters');
    console.log('📊 User Pitch Length:', selectedResume.content ? selectedResume.content.length : 0, 'characters'); // REFACTORED: Updated log message to reflect new purpose
    console.log('📊 Experience Details Length:', selectedResume.experience ? selectedResume.experience.length : 0, 'characters');
    console.log('=== END OF OPENAI PACKAGE ===');
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerText = 'Generating...';
    outputElement.innerText = 'Analyzing job description and generating tailored recommendations...';
    
    try {
        // Call Supabase Edge Function instead of OpenAI directly
        const SUPABASE_URL = 'https://sdlmyaffbnjkmzwpdwqp.supabase.co'; // TODO: Replace with your Supabase URL
        
        // Get authentication header if user is logged in
        let authHeader = null;
        if (auth && isAuthenticated) {
            authHeader = await auth.getAuthHeader();
        }
        
        // Prepare headers
        const headers = { 
            'Content-Type': 'application/json; charset=utf-8'
        };
        
        // Add auth header if available
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/tailor-resume`, {
            method: 'POST',
            headers,
            body: JSON.stringify(openAIPackage)
        });

        const data = await response.json();
        
        console.log('=== OPENAI API RESPONSE ===');
        console.log('📡 Response Status:', response.status, response.statusText);
        console.log('📡 Response Data:', data);
        console.log('📡 Response Success:', data.success);
        console.log('📡 Has Resume PDF:', !!data.resumePDF);
        console.log('📡 Has Cover Letter PDF:', !!data.coverLetterPDF);
        console.log('=== END OF API RESPONSE ===');
        console.log('📡 Full Response Data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if we have a successful response with HTML content
        if (data.success && data.resumeHTML && data.coverLetterHTML) {
            // Generate PDFs from HTML on client side
            outputElement.innerText = 'Converting HTML to PDF...';
            
            try {
                // Generate PDFs from the HTML
                // Generate PDFs sequentially to avoid ETXTBSY resource conflicts
                console.log('📄 Generating resume PDF first...');
                const resumePDF = await generatePDFFromHTML(data.resumeHTML, data.resumeFileName);
                
                // Small delay to prevent resource conflicts on Vercel service
                console.log('⏱️ Waiting 500ms before generating cover letter...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                console.log('📄 Generating cover letter PDF...');
                const coverLetterPDF = await generatePDFFromHTML(data.coverLetterHTML, data.coverLetterFileName);
                
                // Create PDF data object
                const pdfData = {
                    ...data,
                    resumePDF: resumePDF,
                    coverLetterPDF: coverLetterPDF
                };
                
                // Save PDF data to storage
                await saveGeneratedPDFs(pdfData, jobDescription, selectedResumeId);
                
                // Display download options
                updateOutputDisplay('pdfs', pdfData);
                
                // Update button states
                updateButtonStates();
                
            } catch (pdfError) {
                console.error('PDF generation failed, falling back to HTML:', pdfError);
                
                // Fallback: treat HTML as content
                const fallbackData = {
                    ...data,
                    resumePDF: data.resumeHTML,
                    coverLetterPDF: data.coverLetterHTML
                };
                
                await saveGeneratedPDFs(fallbackData, jobDescription, selectedResumeId);
                updateOutputDisplay('pdfs', fallbackData);
                updateButtonStates();
                
                // Show warning
                outputElement.innerHTML += '<br><br>⚠️ PDF generation failed, files saved as HTML';
            }
        } else if (data.success && data.resumePDF && data.coverLetterPDF) {
            // Legacy: if somehow we still get PDF data directly
            await saveGeneratedPDFs(data, jobDescription, selectedResumeId);
            updateOutputDisplay('pdfs', data);
            updateButtonStates();
        } else if (data.success && (data.resumeContent || data.coverLetterContent)) {
            // Handle text content response
            const tailoredResume = data.resumeContent || '';
            const coverLetter = data.coverLetterContent || '';
            
            // Save to persistent storage
            await saveGeneratedContent(tailoredResume, coverLetter, jobDescription, selectedResumeId);
            
            // Display the content
            updateOutputDisplay('resume', tailoredResume);
            
            // Update button states
            updateButtonStates();
        } else {
            outputElement.innerText = 'No recommendations generated. Please try again.\n\nThis might be because:\n• The job description is too short or unclear\n• The API response format was unexpected\n• There was an issue with the content generation\n\nTry using a more detailed job description or check the console for more details.';
        }
    } catch (error) {
        console.error('Error:', error);
        outputElement.innerText = `Error: ${error.message}. Please check your API configuration and try again.`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerText = '🪄 Tailor with AI';
    }
}

function parseAIResponse(response) {
    // This function parses the AI response to extract resume and cover letter
    // You may need to adjust this based on your API response format
    const lines = response.split('\n');
    let tailoredResume = '';
    let coverLetter = '';
    let currentSection = '';
    
    for (const line of lines) {
        if (line.toLowerCase().includes('resume') || line.toLowerCase().includes('cv')) {
            currentSection = 'resume';
        } else if (line.toLowerCase().includes('cover letter') || line.toLowerCase().includes('letter')) {
            currentSection = 'cover';
        } else if (line.trim()) {
            if (currentSection === 'resume') {
                tailoredResume += line + '\n';
            } else if (currentSection === 'cover') {
                coverLetter += line + '\n';
            }
        }
    }
    
    // If no clear sections found, treat the whole response as resume
    if (!tailoredResume && !coverLetter) {
        tailoredResume = response;
    }
    
    return { tailoredResume: tailoredResume.trim(), coverLetter: coverLetter.trim() };
}

async function saveGeneratedContent(tailoredResume, coverLetter, jobDescription, resumeId) {
    const timestamp = new Date().toISOString();
    
    // Save current content
    await chrome.storage.local.set({
        tailoredResume,
        coverLetter,
        lastGenerated: timestamp,
        lastJobDescription: jobDescription,
        lastResumeId: resumeId
    });
    
    // Add to history
    const result = await chrome.storage.local.get(['resumeHistory']);
    const history = result.resumeHistory || [];
    
    history.unshift({
        id: Date.now().toString(),
        timestamp,
        resumeId,
        jobDescription: jobDescription.substring(0, 100) + '...',
        hasResume: !!tailoredResume,
        hasCoverLetter: !!coverLetter
    });
    
    // Keep only last 10 entries
    if (history.length > 10) {
        history.splice(10);
    }
    
    await chrome.storage.local.set({ resumeHistory: history });
}

async function saveGeneratedPDFs(pdfData, jobDescription, resumeId) {
    const timestamp = new Date().toISOString();
    
    console.log('Saving PDF data to storage:', {
        hasResumePDF: !!pdfData.resumePDF,
        hasCoverLetterPDF: !!pdfData.coverLetterPDF,
        resumeFileName: pdfData.resumeFileName,
        coverLetterFileName: pdfData.coverLetterFileName,
        hasResumeContent: !!pdfData.resumeContent,
        hasCoverLetterContent: !!pdfData.coverLetterContent
    });
    
    // Use the new managePDFStorage function to handle PDF storage and history
    await managePDFStorage({
        ...pdfData,
        lastGenerated: timestamp,
        lastJobDescription: jobDescription,
        lastResumeId: resumeId
    });
    
    console.log('PDF data saved successfully to storage');
    
    // Add to resume history (separate from PDF history)
    const result = await chrome.storage.local.get(['resumeHistory']);
    const history = result.resumeHistory || [];
    
    history.unshift({
        id: Date.now().toString(),
        timestamp,
        resumeId,
        jobDescription: jobDescription.substring(0, 100) + '...',
        hasResume: !!pdfData.resumeContent,
        hasCoverLetter: !!pdfData.coverLetterContent,
        hasPDFs: true
    });
    
    // Keep only last 10 entries
    if (history.length > 10) {
        history.splice(10);
    }
    
    await chrome.storage.local.set({ resumeHistory: history });
}

function updateOutputDisplay(type, content) {
    const outputElement = document.getElementById('output');
    if (type === 'resume') {
        outputElement.innerText = `📄 TAILORED RESUME:\n\n${content}`;
    } else if (type === 'cover') {
        outputElement.innerText = `✉️ COVER LETTER:\n\n${content}`;
    } else if (type === 'pdfs') {
        outputElement.innerHTML = `
            <div class="pdf-success">
                <h3>✅ Documents Generated Successfully!</h3>
                <p>Your tailored resume and cover letter are ready for download.</p>
                
                <div class="pdf-downloads">
                    <button id="downloadBothBtn" class="btn btn-success" disabled>
                        📥 Download Both PDFs
                    </button>
                    <div class="individual-downloads" style="margin-top: 10px;">
                        <button id="downloadResumeBtn" class="btn btn-secondary" style="width: 48%; margin-right: 2%;">
                            📄 Resume
                        </button>
                        <button id="downloadCoverBtn" class="btn btn-secondary" style="width: 48%; margin-left: 2%;">
                            ✉️ Cover Letter
                        </button>
                    </div>
                </div>
                
                <div class="pdf-preview">
                    <h4>Resume Preview:</h4>
                    <div class="preview-content">${content.resumeContent ? content.resumeContent.substring(0, 200) + '...' : 'No preview available'}</div>
                    
                    <h4>Cover Letter Preview:</h4>
                    <div class="preview-content">${content.coverLetterContent ? content.coverLetterContent.substring(0, 200) + '...' : 'No preview available'}</div>
                </div>
            </div>
        `;
        
        // Use event delegation to handle button clicks
        const pdfDownloadsContainer = document.querySelector('.pdf-downloads');
        if (pdfDownloadsContainer) {
            pdfDownloadsContainer.addEventListener('click', (event) => {
                if (event.target.id === 'downloadBothBtn') {
                    downloadBothPDFs();
                } else if (event.target.id === 'downloadResumeBtn') {
                    downloadPDF('resume');
                } else if (event.target.id === 'downloadCoverBtn') {
                    downloadPDF('cover');
                }
            });
        }
        
        // Enable the combined download button if both PDFs are ready
        updateDownloadButtonState();
    }
}



// Helper function to extract clean content from PDF HTML
function extractContentFromPDF(pdfHtml) {
    try {
        // Remove the outer wrapper HTML and extract just the content
        const contentMatch = pdfHtml.match(/<div class="content">([\s\S]*?)<\/div>/);
        if (contentMatch) {
            let content = contentMatch[1];
            // Remove HTML tags and decode entities
            content = content.replace(/<[^>]*>/g, '');
            content = content.replace(/&nbsp;/g, ' ');
            content = content.replace(/&lt;/g, '<');
            content = content.replace(/&gt;/g, '>');
            content = content.replace(/&amp;/g, '&');
            return content.trim();
        }
        return null;
    } catch (error) {
        console.error('Error extracting content from PDF:', error);
        return null;
    }
}

function updateButtonStates() {
    chrome.storage.local.get(['resumeContent', 'coverLetterContent', 'resumePDF', 'coverLetterPDF'], (result) => {
        const hasResumeContent = !!result.resumeContent;
        const hasCoverContent = !!result.coverLetterContent;
        const hasResumePDF = !!result.resumePDF;
        const hasCoverPDF = !!result.coverLetterPDF;
        
        // Check if we have any user pitch (either clean content or PDF)
        const hasResume = hasResumeContent || hasResumePDF;
        // Check if we have any cover letter content (either clean content or PDF)
        const hasCover = hasCoverContent || hasCoverPDF;
        // Check if we have any content at all
        const hasAnyContent = hasResume || hasCover;
        
        console.log('Updating button states:', { 
            hasResumeContent, 
            hasCoverContent, 
            hasResumePDF, 
            hasCoverPDF,
            hasResume,
            hasCover,
            hasAnyContent 
        });
        
        console.log('Button states updated. Has any content:', hasAnyContent);
    });
}

function downloadPDF(type) {
    console.log('downloadPDF called with type:', type);
    
    chrome.storage.local.get(['resumePDF', 'coverLetterPDF', 'resumeFileName', 'coverLetterFileName'], (result) => {
        let pdfData, fileName;
        
        if (type === 'resume') {
            pdfData = result.resumePDF;
            fileName = result.resumeFileName || 'resume.pdf';
        } else {
            pdfData = result.coverLetterPDF;
            fileName = result.coverLetterFileName || 'cover-letter.pdf';
        }
        
        // Fix filename extension to be .pdf
        if (fileName.endsWith('.html')) {
            fileName = fileName.replace('.html', '.pdf');
        }
        
        console.log('Download data:', {
            type,
            hasPDFData: !!pdfData,
            fileName,
            pdfDataLength: pdfData ? pdfData.length : 0
        });
        
        if (pdfData) {
            try {
                // Check if this is base64 PDF data or HTML
                if (pdfData.startsWith('<!DOCTYPE html') || pdfData.startsWith('<html')) {
                    // This is HTML (fallback case), download as HTML
                    const blob = new Blob([pdfData], { type: 'text/html; charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName.replace('.pdf', '.html');
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    console.log('Downloaded as HTML (fallback):', fileName);
                } else {
                    // This should be base64 PDF data
                    const byteCharacters = atob(pdfData);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    console.log('Downloaded as PDF:', fileName);
                }
            } catch (error) {
                console.error('Error processing PDF data:', error);
                // Fallback to treating as HTML
                const blob = new Blob([pdfData], { type: 'text/html; charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName.replace('.pdf', '.html');
                a.click();
                URL.revokeObjectURL(url);
                
                console.log('Downloaded as HTML (error fallback):', fileName);
            }
        } else {
            console.error('PDF data not found for type:', type);
            alert('PDF data not found. Please generate the documents again.');
        }
    });
}

// Function to download both PDFs at once
async function downloadBothPDFs() {
    console.log('downloadBothPDFs called');
    
    try {
        const result = await chrome.storage.local.get(['resumePDF', 'coverLetterPDF', 'resumeFileName', 'coverLetterFileName']);
        
        if (!result.resumePDF || !result.coverLetterPDF) {
            alert('Both PDFs are not ready yet. Please wait for generation to complete.');
            return;
        }
        
        // Download resume first
        await downloadSinglePDF('resume', result.resumePDF, result.resumeFileName);
        
        // Small delay to ensure first download starts
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Download cover letter
        await downloadSinglePDF('cover', result.coverLetterPDF, result.coverLetterFileName);
        
        console.log('Both PDFs downloaded successfully');
        
    } catch (error) {
        console.error('Error downloading both PDFs:', error);
        alert('Error downloading PDFs. Please try again.');
    }
}

// Helper function to download a single PDF
async function downloadSinglePDF(type, pdfData, fileName) {
    if (!pdfData) {
        console.error(`PDF data not found for ${type}`);
        return;
    }
    
    // Fix filename extension to be .pdf
    if (fileName && fileName.endsWith('.html')) {
        fileName = fileName.replace('.html', '.pdf');
    }
    
    const finalFileName = fileName || `${type === 'resume' ? 'resume' : 'cover-letter'}.pdf`;
    
    try {
        // Check if this is base64 PDF data or HTML
        if (pdfData.startsWith('<!DOCTYPE html') || pdfData.startsWith('<html')) {
            // This is HTML (fallback case), download as HTML
            const blob = new Blob([pdfData], { type: 'text/html; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName.replace('.pdf', '.html');
            a.click();
            URL.revokeObjectURL(url);
            
            console.log(`Downloaded ${type} as HTML (fallback):`, finalFileName);
        } else {
            // This should be base64 PDF data
            const byteCharacters = atob(pdfData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName;
            a.click();
            URL.revokeObjectURL(url);
            
            console.log(`Downloaded ${type} as PDF:`, finalFileName);
        }
    } catch (error) {
        console.error(`Error processing ${type} PDF data:`, error);
        // Fallback to treating as HTML
        const blob = new Blob([pdfData], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName.replace('.pdf', '.html');
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`Downloaded ${type} as HTML (error fallback):`, finalFileName);
    }
}

// Function to update download button state
function updateDownloadButtonState() {
    chrome.storage.local.get(['resumePDF', 'coverLetterPDF'], (result) => {
        const downloadBothBtn = document.getElementById('downloadBothBtn');
        if (downloadBothBtn) {
            const bothReady = !!result.resumePDF && !!result.coverLetterPDF;
            downloadBothBtn.disabled = !bothReady;
            downloadBothBtn.textContent = bothReady ? '📥 Download Both PDFs' : '⏳ PDFs Not Ready';
        }
    });
}

// Function to manage local storage for PDFs (keep last 2 sets)
async function managePDFStorage(newPDFData) {
    try {
        // Get current PDF history
        const result = await chrome.storage.local.get(['pdfHistory']);
        let pdfHistory = result.pdfHistory || [];
        
        // Add new PDF data to history
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...newPDFData
        };
        
        pdfHistory.unshift(newEntry); // Add to beginning
        
        // Keep only the last 2 entries
        if (pdfHistory.length > 2) {
            pdfHistory = pdfHistory.slice(0, 2);
        }
        
        // Save updated history
        await chrome.storage.local.set({ pdfHistory });
        
        // Also save current PDFs as the active set
        await chrome.storage.local.set({
            resumePDF: newPDFData.resumePDF,
            coverLetterPDF: newPDFData.coverLetterPDF,
            resumeFileName: newPDFData.resumeFileName,
            coverLetterFileName: newPDFData.coverLetterFileName,
            resumeContent: newPDFData.resumeContent,
            coverLetterContent: newPDFData.coverLetterContent,
            hasPDFs: true
        });
        
        console.log('PDF storage managed successfully. History entries:', pdfHistory.length);
        
    } catch (error) {
        console.error('Error managing PDF storage:', error);
    }
}

// Function to check for existing PDFs and show download option if available
function checkExistingPDFs() {
    chrome.storage.local.get(['resumePDF', 'coverLetterPDF', 'resumeFileName', 'coverLetterFileName'], (result) => {
        const hasResumePDF = !!result.resumePDF;
        const hasCoverPDF = !!result.coverLetterPDF;
        
        if (hasResumePDF || hasCoverPDF) {
            console.log('Found existing PDFs, updating download button state');
            
            // Just update the button states if buttons exist
            const downloadBothBtn = document.getElementById('downloadBothBtn');
            const downloadResumeBtn = document.getElementById('downloadResumeBtn');
            const downloadCoverBtn = document.getElementById('downloadCoverBtn');
            
            if (downloadBothBtn) {
                const bothReady = hasResumePDF && hasCoverPDF;
                downloadBothBtn.disabled = !bothReady;
                downloadBothBtn.textContent = bothReady ? '📥 Download Both PDFs' : '⏳ PDFs Not Ready';
            }
            
            if (downloadResumeBtn) {
                downloadResumeBtn.disabled = !hasResumePDF;
                downloadResumeBtn.textContent = `📄 Resume ${hasResumePDF ? `(${result.resumeFileName || 'resume.pdf'})` : '(Not Ready)'}`;
            }
            
            if (downloadCoverBtn) {
                downloadCoverBtn.disabled = !hasCoverPDF;
                downloadCoverBtn.textContent = `✉️ Cover Letter ${hasCoverPDF ? `(${result.coverLetterFileName || 'cover-letter.pdf'})` : '(Not Ready)'}`;
            }
        }
    });
}

// Helper function to proceed with navigation content despite warning
function proceedWithNavigationContent() {
    console.log('Proceed button clicked - starting generation...');
    
    // Clear the warning and proceed with generation
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = '<p>Proceeding with generation...</p>';
    
    // Call the generation function directly
    try {
        handleGenerateInternal();
    } catch (error) {
        console.error('Error in proceedWithNavigationContent:', error);
        outputElement.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Helper function to clear output
function clearOutput() {
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = '';
}

// Internal generation function (without navigation checks)
async function handleGenerateInternal() {
    console.log('handleGenerateInternal called');
    
    const jobDescription = document.getElementById('jobDesc').value;
    const selectedResumeId = document.getElementById('resumeSelect').value;
    const outputElement = document.getElementById('output');
    const generateBtn = document.getElementById('generateBtn');
    
    console.log('Job description length:', jobDescription ? jobDescription.length : 0);
    console.log('Selected resume ID:', selectedResumeId);
    
    if (!jobDescription.trim()) {
        console.log('No job description found in handleGenerateInternal');
        outputElement.innerText = 'Please enter a job description first.\n\n💡 Tip: Click "Extract Job" to automatically extract job descriptions from job posting pages (LinkedIn, Indeed, Glassdoor, etc.)';
        return;
    }
    
    console.log('Job description found in handleGenerateInternal, getting resume data...');
    
    // Get the selected user pitch
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    
    console.log('Resumes found in handleGenerateInternal:', resumes.length);
    console.log('Selected resume in handleGenerateInternal:', selectedResume);
    
    if (!selectedResume || (!selectedResume.content && !selectedResume.experience)) {
        console.log('No valid resume found in handleGenerateInternal');
        outputElement.innerText = 'Please save a resume first using the "Manage Resumes" button.';
        return;
    }
    
    console.log('Resume validation passed in handleGenerateInternal, proceeding with API call...');
    
    // Log the plaintext content being sent to OpenAI
    console.log('=== PLAINTEXT CONTENT FOR OPENAI ===');
    console.log('📄 Job Description:', jobDescription);
    console.log('🎯 User Pitch:', selectedResume.content); // REFACTORED: Updated log message to reflect new purpose
    console.log('📋 Full Experience Details:', selectedResume.experience);
    console.log('📂 Resume Name:', selectedResume.name);
    console.log('🆔 Resume ID:', selectedResumeId);
    console.log('👤 User ID:', 'demo-user');
    
    // Create the complete package being sent to OpenAI API
    const openAIPackage = {
        jobDescription,
        resumeId: selectedResumeId,
        userId: 'demo-user',
        userPitch: selectedResume.content, // REFACTORED: Changed from currentResume to userPitch - this is now the user's personal pitch/story
        fullExperience: selectedResume.experience,
        resumeName: selectedResume.name
    };
    
    console.log('=== COMPLETE PACKAGE SENT TO OPENAI API ===');
    console.log('📦 API Package:', JSON.stringify(openAIPackage, null, 2));
    console.log('📊 Package Size:', JSON.stringify(openAIPackage).length, 'characters');
    console.log('📊 Job Description Length:', jobDescription.length, 'characters');
    console.log('📊 User Pitch Length:', selectedResume.content ? selectedResume.content.length : 0, 'characters'); // REFACTORED: Updated log message to reflect new purpose
    console.log('📊 Experience Details Length:', selectedResume.experience ? selectedResume.experience.length : 0, 'characters');
    console.log('=== END OF OPENAI PACKAGE ===');
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerText = 'Generating...';
    outputElement.innerText = 'Analyzing job description and generating tailored recommendations...';
    
    try {
        // Call Supabase Edge Function instead of OpenAI directly
        const SUPABASE_URL = 'https://sdlmyaffbnjkmzwpdwqp.supabase.co'; // TODO: Replace with your Supabase URL
        
        // Get authentication header if user is logged in
        let authHeader = null;
        if (auth && isAuthenticated) {
            authHeader = await auth.getAuthHeader();
        }
        
        // Prepare headers
        const headers = { 
            'Content-Type': 'application/json; charset=utf-8'
        };
        
        // Add auth header if available
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/tailor-resume`, {
            method: 'POST',
            headers,
            body: JSON.stringify(openAIPackage)
        });

        const data = await response.json();
        
        console.log('=== OPENAI API RESPONSE ===');
        console.log('📡 Response Status:', response.status, response.statusText);
        console.log('📡 Response Data:', data);
        console.log('📡 Response Success:', data.success);
        console.log('📡 Has Resume PDF:', !!data.resumePDF);
        console.log('📡 Has Cover Letter PDF:', !!data.coverLetterPDF);
        console.log('=== END OF API RESPONSE ===');
        console.log('📡 Full Response Data:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
            throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if we have a successful response with HTML content
        if (data.success && data.resumeHTML && data.coverLetterHTML) {
            // Generate PDFs from HTML on client side
            outputElement.innerText = 'Converting HTML to PDF...';
            
            try {
                // Generate PDFs from the HTML
                // Generate PDFs sequentially to avoid ETXTBSY resource conflicts
                console.log('📄 Generating resume PDF first...');
                const resumePDF = await generatePDFFromHTML(data.resumeHTML, data.resumeFileName);
                
                // Small delay to prevent resource conflicts on Vercel service
                console.log('⏱️ Waiting 500ms before generating cover letter...');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                console.log('📄 Generating cover letter PDF...');
                const coverLetterPDF = await generatePDFFromHTML(data.coverLetterHTML, data.coverLetterFileName);
                
                // Create PDF data object
                const pdfData = {
                    ...data,
                    resumePDF: resumePDF,
                    coverLetterPDF: coverLetterPDF
                };
                
                // Save PDF data to storage
                await saveGeneratedPDFs(pdfData, jobDescription, selectedResumeId);
                
                // Display download options
                updateOutputDisplay('pdfs', pdfData);
                
                // Update button states
                updateButtonStates();
                
            } catch (pdfError) {
                console.error('PDF generation failed, falling back to HTML:', pdfError);
                
                // Fallback: treat HTML as content
                const fallbackData = {
                    ...data,
                    resumePDF: data.resumeHTML,
                    coverLetterPDF: data.coverLetterHTML
                };
                
                await saveGeneratedPDFs(fallbackData, jobDescription, selectedResumeId);
                updateOutputDisplay('pdfs', fallbackData);
                updateButtonStates();
                
                // Show warning
                outputElement.innerHTML += '<br><br>⚠️ PDF generation failed, files saved as HTML';
            }
        } else if (data.success && data.resumePDF && data.coverLetterPDF) {
            // Legacy: if somehow we still get PDF data directly
            await saveGeneratedPDFs(data, jobDescription, selectedResumeId);
            updateOutputDisplay('pdfs', data);
            updateButtonStates();
        } else if (data.success && (data.resumeContent || data.coverLetterContent)) {
            // Handle text content response
            const tailoredResume = data.resumeContent || '';
            const coverLetter = data.coverLetterContent || '';
            
            // Save to persistent storage
            await saveGeneratedContent(tailoredResume, coverLetter, jobDescription, selectedResumeId);
            
            // Display the content
            updateOutputDisplay('resume', tailoredResume);
            
            // Update button states
            updateButtonStates();
        } else {
            outputElement.innerText = 'No recommendations generated. Please try again.\n\nThis might be because:\n• The job description is too short or unclear\n• The API response format was unexpected\n• There was an issue with the content generation\n\nTry using a more detailed job description or check the console for more details.';
        }
    } catch (error) {
        console.error('Error:', error);
        outputElement.innerText = `Error: ${error.message}. Please check your API configuration and try again.`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerText = '🪄 Tailor with AI';
    }
}

// Debug function to test extraction manually
async function debugExtraction() {
    const outputElement = document.getElementById('output');
    outputElement.innerText = '🔍 Debugging extraction...';
    
    try {
        console.log('🔍 Starting debug extraction...');
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            outputElement.innerText = '❌ Could not access current tab';
            return;
        }
        
        outputElement.innerText = `🔍 Debugging extraction on: ${tab.url}\n\nChecking content script availability...`;
        
        // First, check if content script is available
        try {
            const results = await chrome.tabs.sendMessage(tab.id, { action: 'extractJobDescription' });
            outputElement.innerText += `\n✅ Content script responded\n📄 Response: ${JSON.stringify(results, null, 2)}`;
        } catch (error) {
            outputElement.innerText += `\n❌ Content script error: ${error.message}`;
            outputElement.innerText += '\n\n💡 Try refreshing the page and clicking the button again.';
            return;
        }
        
    } catch (error) {
        outputElement.innerText = `❌ Debug error: ${error.message}`;
    }
}
  