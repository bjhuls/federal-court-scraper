const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const { executablePath } = require('puppeteer');
require('dotenv').config();

// Add stealth plugin
puppeteer.use(StealthPlugin());

// PACER credentials from environment variables
const PACER_USERNAME = process.env.PACER_USERNAME;
const PACER_PASSWORD = process.env.PACER_PASSWORD;

if (!PACER_USERNAME || !PACER_PASSWORD) {
  console.error('Error: PACER_USERNAME and PACER_PASSWORD must be set in .env file');
  process.exit(1);
}

// PACER URLs
const PACER_LOGIN_URL = 'https://pacer.login.uscourts.gov/csologin/login.jsf';
const PACER_HOME_URL = 'https://pacer.uscourts.gov/';

// Path to the RECAP extension
const EXTENSION_PATH = path.resolve(__dirname, '../extensions/RECAP');

// Main function
(async () => {
  try {
    console.log('Starting browser with PACER login test...');
    
    // Launch browser with extension
    const browser = await puppeteer.launch({
      headless: false, // Set to false to see the browser
      defaultViewport: null,
      executablePath: process.env.CHROME_PATH || executablePath(),
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
        '--mute-audio',
        '--no-zygote',
        '--no-first-run',
        '--disable-notifications',
        '--window-size=1920,1080',
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      dumpio: true // Log browser console output
    });

    console.log('Browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set a longer timeout for page operations
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    // Log console output
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    // Navigate to PACER login
    console.log('Navigating to PACER login page...');
    await page.goto(PACER_LOGIN_URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for the login form to be visible
    console.log('Waiting for login form...');
    await page.waitForSelector('input#loginForm\:loginName', { visible: true, timeout: 30000 });
    
    // Enter credentials
    console.log('Entering credentials...');
    await page.type('input#loginForm\:loginName', PACER_USERNAME);
    await page.type('input#loginForm\:password', PACER_PASSWORD);
    
    // Click the login button
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button#loginForm\:loginButtonId')
    ]);
    
    // Check if login was successful
    const loginError = await page.$('span.ui-messages-error-detail');
    if (loginError) {
      const errorText = await page.evaluate(el => el.textContent, loginError);
      throw new Error(`Login failed: ${errorText}`);
    }
    
    console.log('Login successful!');
    
    // Wait for the PACER home page to load
    console.log('Waiting for PACER home page...');
    await page.waitForSelector('#main-content', { visible: true, timeout: 30000 });
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'pacer-login-success.png', fullPage: true });
    console.log('Screenshot saved as pacer-login-success.png');
    
    // You can now navigate to specific court pages or perform searches
    console.log('Ready to perform searches. The browser will remain open for 5 minutes.');
    
    // Keep the browser open for a while to inspect
    await new Promise(resolve => setTimeout(resolve, 300000));
    
  } catch (error) {
    console.error('Error during PACER login test:', error);
    
    // Take a screenshot on error
    if (page) {
      await page.screenshot({ path: 'pacer-login-error.png', fullPage: true });
      console.log('Screenshot saved as pacer-login-error.png');
    }
    
    process.exit(1);
  } finally {
    // Close the browser
    if (browser) {
      // Uncomment the following line to automatically close the browser
      // await browser.close();
    }
  }
})();
