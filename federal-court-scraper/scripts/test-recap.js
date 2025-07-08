const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

// Add stealth plugin
puppeteer.use(StealthPlugin());

// Path to the RECAP extension
const EXTENSION_PATH = path.resolve(__dirname, '../extensions/RECAP');

(async () => {
  try {
    console.log('Starting browser with RECAP extension...');
    console.log('Extension path:', EXTENSION_PATH);
    
    // Launch browser with extension
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      dumpio: true // Log browser console output
    });

    console.log('Browser launched successfully');
    
    // Wait for the extension to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get the background pages
    const targets = await browser.targets();
    const extensionTargets = targets.filter(target => 
      target.type() === 'background_page' && 
      target.url().includes('chrome-extension://')
    );
    
    console.log(`Found ${extensionTargets.length} extension background pages`);
    
    // Open a test page
    const page = await browser.newPage();
    await page.goto('https://ecf.cand.uscourts.gov', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded. Check if RECAP is working...');
    
    // Check for RECAP in the page
    const recapDetected = await page.evaluate(() => {
      return {
        hasRecapGlobal: typeof window.recap !== 'undefined',
        hasRecapInit: typeof window.recapInit === 'function',
        recapElements: {
          recapAvailable: !!document.querySelector('.recap-available'),
          recapButton: !!document.querySelector('.recap-button')
        }
      };
    });
    
    console.log('RECAP detection results:', JSON.stringify(recapDetected, null, 2));
    
    if (recapDetected.hasRecapGlobal || recapDetected.hasRecapInit || 
        recapDetected.recapElements.recapAvailable) {
      console.log('✅ RECAP extension is working!');
    } else {
      console.warn('⚠️  RECAP extension might not be working correctly');
    }
    
    console.log('\nPress Ctrl+C to exit...');
    
    // Keep the browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error testing RECAP extension:', error);
    process.exit(1);
  }
})();
