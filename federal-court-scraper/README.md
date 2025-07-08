# Federal Court Scraper

A web scraper built with Puppeteer to track new cases in 7 federal district courts.

## Features

- Scrapes multiple federal district court websites for new cases
- Configurable search parameters
- Email notifications for new cases
- Logging for debugging and monitoring
- Runs on a schedule using GitHub Actions

## Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/federal-court-scraper.git
   cd federal-court-scraper
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with your configuration:
   ```env
   # Email configuration
   EMAIL_ENABLED=false
   EMAIL_FROM=your-email@example.com
   EMAIL_TO=recipient1@example.com,recipient2@example.com
   
   # SMTP configuration (if email is enabled)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   
   # Logging
   LOG_LEVEL=info
   ```

## Usage

### Running the scraper locally

```bash
npm start
```

### Running tests

```bash
npm test
```

### Linting and formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

Edit the `src/config.js` file to configure:

- Court configurations (URLs, selectors, etc.)
- Search parameters
- Email notifications
- Logging settings
- Puppeteer options

## Adding a New Court Scraper

1. Create a new scraper class in `src/scrapers/` that extends `BaseScraper`
2. Implement the required methods (`performSearch`, `extractResults`)
3. Add an instance of your scraper to the `scrapers` array in `src/index.js`

## GitHub Actions

The workflow in `.github/workflows/scraper.yml` is configured to run the scraper:

- **Schedule**: Every weekday at 9:00 AM
- **Manual trigger**: Available through the GitHub Actions UI
- **Artifacts**: Results and logs are available as workflow artifacts

## License

MIT
