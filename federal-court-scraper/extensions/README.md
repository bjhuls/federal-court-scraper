# Chrome Extensions

This directory contains Chrome extensions that will be loaded with Puppeteer.

## Setting Up an Extension

1. Place your unpacked Chrome extension in its own subdirectory here.
2. The extension should be in its unpacked format (i.e., the folder containing the manifest.json).
3. Ensure the extension is compatible with the Chrome version you're using with Puppeteer.

## Example Structure

```
extensions/
  ├── my-extension/     # Your extension directory
  │   ├── manifest.json
  │   ├── background.js
  │   └── ...
  └── README.md
```

## Important Notes

- The extension will be loaded in the same context as your scraper.
- Make sure your extension's permissions are properly set in manifest.json.
- Some extensions may require additional configuration in the browser launch options.

## Environment Variables

Set the path to your Chrome/Chromium executable:

```bash
# On Windows
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

# On macOS/Linux
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```
