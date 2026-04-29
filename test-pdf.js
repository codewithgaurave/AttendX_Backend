const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Testing Puppeteer...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ] 
    });
    
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('Page created');
    
    await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
    console.log('Content set');
    
    const pdf = await page.pdf({ format: 'A4' });
    console.log('PDF generated, size:', pdf.length, 'bytes');
    
    await browser.close();
    console.log('Browser closed');
    
    console.log('✅ Puppeteer test successful!');
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error);
  }
}

testPuppeteer();