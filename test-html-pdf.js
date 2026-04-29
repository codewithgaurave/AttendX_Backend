const pdf = require('html-pdf');
const fs = require('fs');

console.log('Testing html-pdf...');

const html = `
<html>
<body>
  <h1>Test PDF</h1>
  <p>This is a test PDF generated using html-pdf</p>
</body>
</html>
`;

const options = {
  format: 'A4',
  border: {
    top: "0.5in",
    right: "0.5in", 
    bottom: "0.5in",
    left: "0.5in"
  }
};

pdf.create(html, options).toBuffer((err, buffer) => {
  if (err) {
    console.error('❌ PDF generation failed:', err);
  } else {
    console.log('✅ PDF generated successfully, size:', buffer.length, 'bytes');
    // Save test file
    fs.writeFileSync('./test-output.pdf', buffer);
    console.log('✅ Test PDF saved as test-output.pdf');
  }
});