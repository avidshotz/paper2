// watch-extension.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('👀 Watching for .env changes...');
console.log('🔄 Extension will automatically rebuild when .env is modified');
console.log('⏹️  Press Ctrl+C to stop watching');

let lastModified = 0;

fs.watchFile('.env', (curr, prev) => {
    // Prevent multiple rebuilds for the same change
    if (curr.mtime.getTime() === lastModified) {
        return;
    }
    
    lastModified = curr.mtime.getTime();
    
    console.log('🔄 .env changed, rebuilding extension...');
    
    exec('node build-extension.js', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Build failed:', error);
            return;
        }
        console.log(stdout);
    });
});

// Initial build
console.log('🔨 Running initial build...');
exec('node build-extension.js', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Initial build failed:', error);
        return;
    }
    console.log(stdout);
});
