#!/usr/bin/env node

const CANDScraper = require('./scrapers/CANDScraper');
const logger = require('./utils/logger');
const config = require('./config');
const nodemailer = require('nodemailer');

class FederalCourtScraper {
  constructor() {
    this.scrapers = [
      new CANDScraper(),
      // Add other court scrapers here
    ];
    this.results = [];
  }

  async run() {
    try {
      logger.info('Starting federal court scraper');
      
      // Run all scrapers in sequence
      for (const scraper of this.scrapers) {
        try {
          logger.info(`Running scraper for ${scraper.courtConfig.name}`);
          const results = await scraper.run(config.searchParams);
          this.results = this.results.concat(results);
          logger.info(`Found ${results.length} cases in ${scraper.courtConfig.name}`);
        } catch (error) {
          logger.error(`Error running scraper for ${scraper.courtConfig.name}: ${error.message}`);
        }
      }
      
      // Process and report results
      await this.processResults();
      
      logger.info('Federal court scraper completed successfully');
    } catch (error) {
      logger.error(`Fatal error in federal court scraper: ${error.message}`);
      process.exit(1);
    }
  }

  async processResults() {
    if (this.results.length === 0) {
      logger.info('No new cases found');
      return;
    }

    logger.info(`Found ${this.results.length} total cases across all courts`);
    
    // Save results to file
    await this.saveResultsToFile();
    
    // Send email notification if enabled
    if (config.email.enabled) {
      await this.sendEmailNotification();
    }
  }

  async saveResultsToFile() {
    const fs = require('fs').promises;
    const path = require('path');
    const resultsDir = path.join(__dirname, '../../data');
    const filename = `cases_${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      await fs.writeFile(
        path.join(resultsDir, filename),
        JSON.stringify(this.results, null, 2),
        'utf8'
      );
      logger.info(`Results saved to data/${filename}`);
    } catch (error) {
      logger.error(`Failed to save results: ${error.message}`);
    }
  }

  async sendEmailNotification() {
    if (config.email.to.length === 0) {
      logger.warn('No email recipients configured');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
    });

    const mailOptions = {
      from: config.email.from,
      to: config.email.to.join(','),
      subject: `Federal Court Updates - ${new Date().toLocaleDateString()}`,
      text: `Found ${this.results.length} new cases across all courts.\n\n` +
        'Please check the attached file for details.',
      attachments: [
        {
          filename: 'cases.json',
          content: JSON.stringify(this.results, null, 2),
        },
      ],
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info('Email notification sent successfully');
    } catch (error) {
      logger.error(`Failed to send email: ${error.message}`);
    }
  }
}

// Run the scraper
const scraper = new FederalCourtScraper();
scraper.run().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
