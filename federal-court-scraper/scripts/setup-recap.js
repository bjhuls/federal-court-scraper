const https = require('https');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const extract = require('extract-zip');

const pipeline = promisify(stream.pipeline);

// Helper function to safely remove directories
const rm = async (path, options = {}) => {
  try {
    await fsp.rm(path, { recursive: true, force: true, ...options });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

const EXTENSIONS_DIR = path.join(__dirname, '../extensions');
const RECAP_DIR = path.join(EXTENSIONS_DIR, 'recap-extension');
const RECAP_EXTENSION_URL = 'https://storage.courtlistener.com/extension/recap-extension.zip';

async function downloadFile(url, outputPath) {
  console.log(`Downloading RECAP extension from ${url}...`);
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download completed');
          resolve();
        });
      } else {
        file.close();
        // Delete the file async, but don't wait for it
        fs.unlink(outputPath, () => reject(new Error(`Failed to download: ${response.statusCode}`)));
      }
    });
    
    request.on('error', (err) => {
      // Delete the file async, but don't wait for it
      fs.unlink(outputPath, () => reject(err));
    });
  });
}

async function setupRecapExtension() {
  try {
    // Create extensions directory if it doesn't exist
    await fsp.mkdir(EXTENSIONS_DIR, { recursive: true });
    
    // Remove existing RECAP extension if it exists
    console.log('Removing existing RECAP extension...');
    await rm(RECAP_DIR);
    
    // Create a temporary directory for the download
    const tempDir = path.join(EXTENSIONS_DIR, 'temp-recap');
    const zipPath = path.join(tempDir, 'recap-extension.zip');
    
    try {
      await fsp.mkdir(tempDir, { recursive: true });
      
      // Download the RECAP extension
      await downloadFile(RECAP_EXTENSION_URL, zipPath);
      
      // Extract the extension
      console.log('Extracting RECAP extension...');
      await extract(zipPath, { dir: tempDir });
      
      // Find the extracted extension directory
      const files = await fsp.readdir(tempDir);
      const extensionDir = files.find(file => 
        file.startsWith('recap-extension-') || file === 'recap-extension');
      
      if (!extensionDir) {
        throw new Error('Could not find extracted RECAP extension directory');
      }
      
      // Move the extension to the final location
      await fsp.rename(path.join(tempDir, extensionDir), RECAP_DIR);
      
      console.log('RECAP extension extracted successfully');
      
    } finally {
      // Clean up the temporary directory
      await rm(tempDir).catch(err => {
        console.warn('Warning: Failed to clean up temporary directory:', err.message);
      });
      
      // Remove the zip file if it still exists
      try {
        await fsp.unlink(zipPath);
      } catch (err) {
        // Ignore if file doesn't exist
        if (err.code !== 'ENOENT') {
          console.warn('Warning: Failed to clean up zip file:', err.message);
        }
      }
    }
    
    console.log('RECAP extension setup completed successfully!');
    console.log(`Extension installed at: ${RECAP_DIR}`);
    
  } catch (error) {
    console.error('Error setting up RECAP extension:', error);
    process.exit(1);
  }
}

// Run the setup
setupRecapExtension();
