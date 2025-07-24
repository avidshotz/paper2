// popup.js
window.onload = function () {
    chrome.storage.local.get(['jobText'], function (result) {
      if (result.jobText) {
        document.getElementById('jobDesc').value = result.jobText;
      }
    });
  
    document.getElementById('generateBtn').addEventListener('click', async () => {
      const jobDescription = document.getElementById('jobDesc').value;
  
      const response = await fetch('https://your-vercel-app.vercel.app/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          resumeId: 'demo-resume-id',
          userId: 'demo-user'
        })
      });
  
      const data = await response.json();
      document.getElementById('output').innerText = data.result || 'No response';
    });
  };
  