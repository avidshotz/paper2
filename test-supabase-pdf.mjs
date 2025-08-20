// Test script for Supabase PDF proxy
// Run with: node test-supabase-pdf.js

import { readFileSync } from 'fs';

const testSupabasePDF = async () => {
  // Read environment variables from .env.local
  let SUPABASE_URL, SUPABASE_ANON_KEY;
  try {
    const envContent = readFileSync('.env.local', 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.startsWith('SUPABASE_URL=')) {
        SUPABASE_URL = line.split('=')[1].trim();
      }
      if (line.startsWith('SUPABASE_ANON_KEY=')) {
        SUPABASE_ANON_KEY = line.split('=')[1].trim();
      }
    }
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
    return;
  }
  const sampleContent = `
    <div class="resume-header">
      <h1 class="candidate-name">John Doe</h1>
      <div class="contact-info">
        <span class="email">john.doe@example.com</span> | 
        <span class="phone">(555) 123-4567</span> | 
        <span class="location">New York, NY</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Professional Summary</h2>
      <p>Experienced software developer with 5+ years of expertise in full-stack development, 
      specializing in JavaScript, React, and Node.js. Proven track record of delivering 
      high-quality web applications and leading cross-functional teams.</p>
    </div>
    
    <div class="section">
      <h2>Technical Skills</h2>
      <ul class="skills-list">
        <li>JavaScript/TypeScript</li>
        <li>React.js & Next.js</li>
        <li>Node.js & Express</li>
        <li>PostgreSQL & MongoDB</li>
        <li>AWS & Docker</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>Professional Experience</h2>
      <div class="experience-item">
        <div class="role-header">
          <h3>Senior Software Developer</h3>
          <div class="company-info">Tech Solutions Inc. | 2021 - Present</div>
        </div>
        <ul class="achievements">
          <li>Led development of customer portal serving 10,000+ users</li>
          <li>Improved application performance by 40% through optimization</li>
          <li>Mentored junior developers and conducted code reviews</li>
        </ul>
      </div>
    </div>
  `;

  const testData = {
    content: sampleContent,
    title: 'Test Resume',
    type: 'resume'
  };

  try {
    const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tailor-resume`;
    
    console.log('🧪 Testing Supabase PDF proxy...');
    console.log(`📡 Calling: ${FUNCTION_URL}/generate-pdf`);
    
    const response = await fetch(`${FUNCTION_URL}/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    
    if (result.success && result.pdfData) {
      console.log('✅ PDF generation successful!');
      console.log(`📊 PDF data length: ${result.pdfData.length} characters`);
      console.log(`📁 Filename: ${result.fileName}`);
      
      // Save PDF to file
      const fs = await import('fs');
      const pdfBuffer = Buffer.from(result.pdfData, 'base64');
      const filename = `test-supabase-resume.pdf`;
      
      fs.writeFileSync(filename, pdfBuffer);
      console.log(`💾 PDF saved as: ${filename}`);
      console.log(`📄 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      
    } else {
      throw new Error(result.error || 'PDF generation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testSupabasePDF();
