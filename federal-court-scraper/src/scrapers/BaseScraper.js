const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const config = require('../config');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

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
      
      this.browser = await puppeteer.launch(config.puppeteer);
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
        logger.debug(`Browser console: ${msg.text()}`);
      });
      
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

  async cleanup() {
    try {
      if (this.browser) {
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
