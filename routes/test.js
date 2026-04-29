const express = require('express');
const router = express.Router();

// Simple test without authentication
router.get('/simple-test', (req, res) => {
  console.log('Simple test endpoint hit');
  res.json({ 
    message: 'Test endpoint working', 
    timestamp: new Date(),
    params: req.params,
    query: req.query 
  });
});

// Simple HTML test
router.get('/simple-html', (req, res) => {
  console.log('Simple HTML endpoint hit');
  const html = `
    <html>
    <head><title>Test</title></head>
    <body>
      <h1>Test HTML Response</h1>
      <p>Time: ${new Date()}</p>
      <button onclick="window.print()">Print This Page</button>
    </body>
    </html>
  `;
  res.send(html);
});

module.exports = router;