require('dotenv').config();

module.exports = {
  // Court configurations
  courts: [
    {
      id: 'cand',
      name: 'California Northern District',
      searchUrl: 'https://ecf.cand.uscourts.gov/cgi-bin/iquery.pl',
      // Add other court-specific configurations
    },
    // Add more courts here
  ],
  
  // Search parameters
  searchParams: {
    caseType: 'cv', // Civil cases
    caseStatus: 'open',
    dateFiledFrom: '1', // Last 1 day
    // Add other search parameters
  },
  
  // Email notification settings
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to: process.env.EMAIL_TO ? process.env.EMAIL_TO.split(',') : [],
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'scraper.log',
  },
  
  // Puppeteer settings
  puppeteer: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.PUPPETEER_SLOWMO || '0'),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  },
};
