const Employee = require("../models/Employee");
const jwt = require('jsonwebtoken');

// Simple alternative - return HTML that can be printed as PDF
exports.downloadSalarySlipHTML = async (req, res) => {
  console.log('=== HTML SALARY SLIP DOWNLOAD START ===');
  console.log('Employee ID:', req.params.employeeId);
  console.log('Month:', req.query.month);
  
  try {
    // Get token from query or header
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).send('<h1>Authentication required</h1>');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;
    
    const { month } = req.query;
    if (!month) {
      return res.status(400).send('<h1>Month parameter required</h1>');
    }

    const employee = await Employee.findOne({ _id: req.params.employeeId, adminId });
    if (!employee) {
      return res.status(404).send('<h1>Employee not found</h1>');
    }

    if (!employee.monthlySalary || employee.monthlySalary <= 0) {
      return res.status(400).send('<h1>Employee salary not set</h1>');
    }

    const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    // Simple HTML response for now
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Salary Slip - ${employee.name}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0;
          padding: 20px;
          background: white;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .company-name {
          font-size: 32px;
          font-weight: bold;
          color: #1a1612;
          margin-bottom: 5px;
        }
        .document-title {
          font-size: 18px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px dotted #ccc;
        }
        .label { 
          font-weight: bold;
          color: #333;
        }
        .value {
          color: #000;
        }
        .salary-amount {
          font-size: 24px;
          font-weight: bold;
          color: #c84b2f;
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          border: 2px solid #c84b2f;
          background: #faf7f4;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">ATTENDX</div>
          <div class="document-title">Salary Slip</div>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <span class="label">Employee Name:</span>
            <span class="value">${employee.name}</span>
          </div>
          <div class="info-row">
            <span class="label">Employee Code:</span>
            <span class="value">${employee.employeeCode}</span>
          </div>
          <div class="info-row">
            <span class="label">Designation:</span>
            <span class="value">${employee.designation}</span>
          </div>
          <div class="info-row">
            <span class="label">Department:</span>
            <span class="value">${employee.department || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Salary Period:</span>
            <span class="value">${monthLabel}</span>
          </div>
        </div>
        
        <div class="salary-amount">
          Monthly Salary: ₹${employee.monthlySalary.toLocaleString('en-IN')}
        </div>
        
        <div class="footer">
          <p><strong>Note:</strong> This is a system-generated salary slip.</p>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
          <p><strong>AttendX Attendance Management System</strong></p>
        </div>
      </div>
      
      <script>
        // Auto print when page loads
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (err) {
    console.error('HTML slip error:', err);
    res.status(500).send('<h1>Error generating salary slip</h1>');
  }
};