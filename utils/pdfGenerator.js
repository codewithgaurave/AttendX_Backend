const fs = require('fs');
const path = require('path');

// Simple HTML to PDF without puppeteer
const generateSimplePDF = (htmlContent, outputPath) => {
  return new Promise((resolve, reject) => {
    // For now, just save as HTML file for testing
    fs.writeFileSync(outputPath, htmlContent);
    resolve(outputPath);
  });
};

module.exports = { generateSimplePDF };