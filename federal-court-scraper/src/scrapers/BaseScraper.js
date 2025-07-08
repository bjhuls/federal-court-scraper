const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const config = require('../config');
const path = require('path');
const os = require('os');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Path to the RECAP extension
const EXTENSION_PATH = path.resolve(__dirname, '../../extensions/RECAP');

// Log the extension path for debugging
logger.info(`Using RECAP extension from: ${EXTENSION_PATH}`);

class BaseScraper {
  constructor(courtConfig) {
    this.courtConfig = courtConfig;
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    try {
      logger.info(`Initializing scraper for ${this.courtConfig.name}`);
      
      // Configure Chrome with RECAP extension
      const chromeOptions = {
        ...config.puppeteer,
        headless: false, // Set to false to see the browser (for debugging)
        executablePath: process.env.CHROME_PATH || null, // Path to Chrome/Chromium executable
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
          '--disable-popup-blocking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-networking',
          '--disable-client-side-phishing-detection',
          '--disable-default-apps',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-sync',
          '--metrics-recording-only',
          '--safebrowsing-disable-auto-update',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-blink-features=AutomationControlled'
        ],
        ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        dumpio: true // Log browser console output
      };
      
      // Log the launch options for debugging
      logger.debug('Launching browser with options:', {
        ...chromeOptions,
        // Don't log sensitive info
        args: chromeOptions.args.map(arg => 
          arg.includes('profile-directory') ? '--profile-directory=***' : arg
        )
      });
      
      this.browser = await puppeteer.launch(chromeOptions);
      
      // Wait for the extension to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get the background page of the extension (if needed)
      const targets = await this.browser.targets();
      const extensionTargets = targets.filter(target => 
        target.type() === 'background_page' && 
        target.url().includes('chrome-extension://')
      );
      
      if (extensionTargets.length > 0) {
        logger.info(`Found ${extensionTargets.length} extension background pages`);
        this.extensionPages = await Promise.all(
          extensionTargets.map(target => target.page())
        );
      }
      
      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set viewport and user agent
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set default timeout
      this.page.setDefaultTimeout(60000);
      
      // Handle page errors
      this.page.on('pageerror', error => {
        logger.error(`Page error: ${error.message}`);
      });
      
      // Handle console logs
      this.page.on('console', msg => {
        const text = msg.text();
        // Filter out common RECAP extension messages
        if (!text.includes('RECAP:') && !text.includes('background.js')) {
          logger.debug(`Browser console: ${text}`);
        }
      });
      
      // Wait for RECAP to be ready
      await this.waitForRecapReady();
      
      logger.info(`Scraper initialized for ${this.courtConfig.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to initialize scraper for ${this.courtConfig.name}: ${error.message}`);
      throw error;
    }
  }

  async navigateToSearch() {
    try {
      logger.info(`Navigating to search page: ${this.courtConfig.searchUrl}`);
      await this.page.goto(this.courtConfig.searchUrl, { waitUntil: 'networkidle2' });
      // Add any necessary navigation logic here
    } catch (error) {
      logger.error(`Navigation failed: ${error.message}`);
      throw error;
    }
  }

  async performSearch(searchParams) {
    // This method should be implemented by specific court scrapers
    throw new Error('performSearch() must be implemented by subclass');
  }

  async extractResults() {
    // This method should be implemented by specific court scrapers
    throw new Error('extractResults() must be implemented by subclass');
  }

  async waitForRecapReady() {
    try {
      logger.info('Waiting for RECAP extension to be ready...');
      
      // Wait for the RECAP extension to be available in the page
      await this.page.waitForFunction(
        () => {
          // Check for RECAP in window object or as a global function
          return (
            window.recap || 
            (typeof window.recapInit === 'function') ||
            document.querySelector('.recap-available')
          );
        },
        { 
          timeout: 60000, // 60 seconds timeout
          polling: 1000   // Check every second
        }
      );
      
      logger.info('RECAP extension is ready');
      return true;
    } catch (error) {
      logger.warn('RECAP extension might not be fully loaded:', error.message);
      
      // Try to detect if the extension is loaded in another way
      const isExtensionLoaded = await this.page.evaluate(() => {
        // Check for common RECAP elements or functions
        return (
          typeof window.recap !== 'undefined' ||
          typeof window.recapInit === 'function' ||
          document.querySelector('.recap-available')
        );
      });
      
      if (isExtensionLoaded) {
        logger.info('RECAP extension is loaded but not fully initialized');
        return true;
      }
      
      logger.error('RECAP extension failed to load properly');
      return false;
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        // Close all pages before closing the browser
        const pages = await this.browser.pages();
        await Promise.all(pages.map(page => page.close()));
        
        // Close the browser
        await this.browser.close();
        logger.info('Browser closed successfully');
      }
    } catch (error) {
      logger.error(`Error during cleanup: ${error.message}`);
    }
  }

  async run(searchParams = {}) {
    try {
      await this.initialize();
      await this.navigateToSearch();
      await this.performSearch(searchParams);
      const results = await this.extractResults();
      this.results = results;
      return results;
    } catch (error) {
      logger.error(`Error during scraping: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = BaseScraper;
