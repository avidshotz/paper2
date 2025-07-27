// popup.js

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
});

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
    
    // View buttons
    addEventListenerSafely('viewResumeBtn', 'click', () => viewSavedContent('resume'));
    addEventListenerSafely('viewCoverBtn', 'click', () => viewSavedContent('cover'));
    
    // Download button
    addEventListenerSafely('downloadBtn', 'click', downloadContent);
    
    // Regenerate button
    addEventListenerSafely('regenerateBtn', 'click', handleGenerate);
    
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
        
        // Also add a simple test click handler
        loadBtn.addEventListener('click', function() {
            console.log('Simple click test - button is clickable');
        });
    } else {
        console.error('Load Resume button not found!');
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
        // Update the resume content display area
        const resumeContentArea = document.getElementById('resumeContent');
        if (resumeContentArea) {
            resumeContentArea.value = selectedResume.content || '';
        }
        
        // Update experience area
        const experienceArea = document.getElementById('experienceContent');
        if (experienceArea) {
            experienceArea.value = selectedResume.experience || '';
        }
    }
}

async function saveCurrentResume() {
    const selectedId = document.getElementById('resumeSelect').value;
    const resumeContent = document.getElementById('resumeContent').value;
    const experienceContent = document.getElementById('experienceContent').value;
    
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    
    const resumeIndex = resumes.findIndex(r => r.id === selectedId);
    if (resumeIndex !== -1) {
        resumes[resumeIndex].content = resumeContent;
        resumes[resumeIndex].experience = experienceContent;
        resumes[resumeIndex].lastUpdated = new Date().toISOString();
        
        await chrome.storage.local.set({ userResumes: resumes });
        
        // Show success message
        const outputElement = document.getElementById('output');
        outputElement.innerText = '✅ Resume saved successfully!';
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
            <label for="resumeContent"><strong>Current Resume Content:</strong></label>
            <textarea id="resumeContent" name="resumeContent" placeholder="Paste your current resume here..."></textarea>
        </div>
        
        <div class="resume-manager-section">
            <label for="experienceContent"><strong>📋 Full Experience Details (for GPT):</strong></label>
            <textarea id="experienceContent" name="experienceContent"
                      placeholder="Include ALL your experience, skills, projects, achievements, certifications, education, etc. This gives GPT maximum context to tailor your resume..."></textarea>
        </div>
        
        <div class="resume-manager-buttons">
            <button id="saveResumeBtn" class="btn-success">💾 Save Resume</button>
            <button id="previewResumeBtn" class="btn-primary">👁️ Preview Resume</button>
            <button id="closeResumeManagerBtn" class="btn-secondary">❌ Close</button>
        </div>
        
        <div class="resume-manager-tip">
            💡 <strong>Tip:</strong> The more detailed your experience section, the better GPT can tailor your resume to specific job descriptions!
        </div>
    `;
    
    // Load current resume content
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

function previewCurrentResume() {
    const resumeContent = document.getElementById('resumeContent').value;
    const experienceContent = document.getElementById('experienceContent').value;
    const selectedId = document.getElementById('resumeSelect').value;
    
    if (!resumeContent.trim() && !experienceContent.trim()) {
        alert('No content to preview. Please add some resume content first.');
        return;
    }
    
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = `
        <div class="preview-header">
            <h3>👁️ Resume Preview</h3>
            <p>Selected Resume: ${getResumeNameById(selectedId)}</p>
        </div>
        
        ${resumeContent ? `
        <div class="preview-section">
            <h4>📄 Current Resume Content:</h4>
            <div class="preview-content">
                ${resumeContent}
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
            <button onclick="showResumeManager()" class="btn-secondary">← Back to Editor</button>
            <button onclick="viewAllResumes()" class="btn-primary">📋 View All Resumes</button>
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
                <p>Click on any resume to view its content</p>
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
            <button onclick="showResumeManager()" class="btn-secondary">← Back to Editor</button>
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
                    <h4>📄 Resume Content:</h4>
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
                    <p>❌ This resume has no content saved yet.</p>
                </div>
            `;
        }
        
        html += `
            <div class="resume-detail-actions">
                <button onclick="selectResume('${resumeId}')" class="btn-success">✅ Select This Resume</button>
                <button onclick="viewAllResumes()" class="btn-secondary">← Back to All Resumes</button>
                <button onclick="showResumeManager()" class="btn-primary">📝 Edit Resumes</button>
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
        <button onclick="showResumeManager()" class="btn-secondary">← Back to Editor</button>
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
            
            // Save the resume content to the current slot
            const result = await chrome.storage.local.get(['userResumes']);
            const resumes = result.userResumes || [];
            
            const resumeIndex = resumes.findIndex(r => r.id === currentSlotId);
            if (resumeIndex !== -1) {
                resumes[resumeIndex].content = resumeContent;
                resumes[resumeIndex].lastUpdated = new Date().toISOString();
                resumes[resumeIndex].loadedFrom = file.name;
                
                await chrome.storage.local.set({ userResumes: resumes });
                
                // Show success message
                const outputElement = document.getElementById('output');
                outputElement.innerHTML = `
                    <div class="success-message">
                        <p>✅ Resume loaded successfully!</p>
                        <p>File: ${file.name}<br>
                        Slot: ${getResumeNameById(currentSlotId)}<br>
                        Content length: ${resumeContent.length} characters</p>
                    </div>
                    <div class="load-actions">
                        <button onclick="showResumeManager()" class="btn-success">📝 Manage Resumes</button>
                        <button onclick="clearLoadResume()" class="btn-secondary">❌ Close</button>
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

async function handleGenerate() {
    const jobDescription = document.getElementById('jobDesc').value;
    const selectedResumeId = document.getElementById('resumeSelect').value;
    const outputElement = document.getElementById('output');
    const generateBtn = document.getElementById('generateBtn');
    
    if (!jobDescription.trim()) {
        outputElement.innerText = 'Please enter a job description first.';
        return;
    }
    
    // Get the selected resume content
    const result = await chrome.storage.local.get(['userResumes']);
    const resumes = result.userResumes || [];
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    
    if (!selectedResume || (!selectedResume.content && !selectedResume.experience)) {
        outputElement.innerText = 'Please save a resume first using the "Manage Resumes" button.';
        return;
    }
    
    // Log the plaintext content being sent to OpenAI
    console.log('=== PLAINTEXT CONTENT FOR OPENAI ===');
    console.log('📄 Job Description:', jobDescription);
    console.log('📋 Current Resume Content:', selectedResume.content);
    console.log('📋 Full Experience Details:', selectedResume.experience);
    console.log('📂 Resume Name:', selectedResume.name);
    console.log('🆔 Resume ID:', selectedResumeId);
    console.log('👤 User ID:', 'demo-user');
    
    // Create the complete package being sent to OpenAI API
    const openAIPackage = {
        jobDescription,
        resumeId: selectedResumeId,
        userId: 'demo-user',
        currentResume: selectedResume.content,
        fullExperience: selectedResume.experience,
        resumeName: selectedResume.name
    };
    
    console.log('=== COMPLETE PACKAGE SENT TO OPENAI API ===');
    console.log('📦 API Package:', JSON.stringify(openAIPackage, null, 2));
    console.log('📊 Package Size:', JSON.stringify(openAIPackage).length, 'characters');
    console.log('📊 Job Description Length:', jobDescription.length, 'characters');
    console.log('📊 Resume Content Length:', selectedResume.content ? selectedResume.content.length : 0, 'characters');
    console.log('📊 Experience Details Length:', selectedResume.experience ? selectedResume.experience.length : 0, 'characters');
    console.log('=== END OF OPENAI PACKAGE ===');
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerText = 'Generating...';
    outputElement.innerText = 'Analyzing job description and generating tailored recommendations...';
    
    try {
        const response = await fetch('https://your-vercel-app.vercel.app/api/tailor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(openAIPackage)
        });

        const data = await response.json();
        
        console.log('=== OPENAI API RESPONSE ===');
        console.log('📡 Response Status:', response.status, response.statusText);
        console.log('📡 Response Data:', data);
        console.log('📡 Response Success:', data.success);
        console.log('📡 Response Result Length:', data.result ? data.result.length : 0, 'characters');
        console.log('=== END OF API RESPONSE ===');
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (data.success && data.result) {
            // Parse the response to extract resume and cover letter
            const { tailoredResume, coverLetter } = parseAIResponse(data.result);
            
            // Save to persistent storage
            await saveGeneratedContent(tailoredResume, coverLetter, jobDescription, selectedResumeId);
            
            // Display the content
            updateOutputDisplay('resume', tailoredResume);
            
            // Update button states
            updateButtonStates();
            
        } else {
            outputElement.innerText = 'No recommendations generated. Please try again.';
        }
    } catch (error) {
        console.error('Error:', error);
        outputElement.innerText = `Error: ${error.message}. Please check your API configuration and try again.`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerText = 'Generate Recommendations';
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

function updateOutputDisplay(type, content) {
    const outputElement = document.getElementById('output');
    if (type === 'resume') {
        outputElement.innerText = `📄 TAILORED RESUME:\n\n${content}`;
    } else if (type === 'cover') {
        outputElement.innerText = `✉️ COVER LETTER:\n\n${content}`;
    }
}

function viewSavedContent(type) {
    chrome.storage.local.get([type === 'resume' ? 'tailoredResume' : 'coverLetter'], (result) => {
        const content = type === 'resume' ? result.tailoredResume : result.coverLetter;
        if (content) {
            updateOutputDisplay(type, content);
        } else {
            document.getElementById('output').innerText = `No ${type} content available. Generate one first.`;
        }
    });
}

function updateButtonStates() {
    chrome.storage.local.get(['tailoredResume', 'coverLetter'], (result) => {
        const hasResume = !!result.tailoredResume;
        const hasCover = !!result.coverLetter;
        
        document.getElementById('viewResumeBtn').disabled = !hasResume;
        document.getElementById('viewCoverBtn').disabled = !hasCover;
        document.getElementById('downloadBtn').disabled = !hasResume && !hasCover;
        document.getElementById('regenerateBtn').disabled = !hasResume && !hasCover;
    });
}

function downloadContent() {
    chrome.storage.local.get(['tailoredResume', 'coverLetter', 'lastJobDescription'], (result) => {
        let content = '';
        
        if (result.tailoredResume) {
            content += 'TAILORED RESUME\n';
            content += '='.repeat(50) + '\n\n';
            content += result.tailoredResume + '\n\n';
        }
        
        if (result.coverLetter) {
            content += 'COVER LETTER\n';
            content += '='.repeat(50) + '\n\n';
            content += result.coverLetter + '\n\n';
        }
        
        if (result.lastJobDescription) {
            content += 'ORIGINAL JOB DESCRIPTION\n';
            content += '='.repeat(50) + '\n\n';
            content += result.lastJobDescription;
        }
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tailored-resume-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
}
  