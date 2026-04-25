const puppeteer = require("puppeteer");
const Employee  = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday   = require("../models/Holiday");

// Helper: convert number to words (Indian format)
const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let nStr = ('000000000' + n).substr(-9);
    let nArray = nStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArray) return '';
    let str = '';
    str += (nArray[1] != 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
    str += (nArray[2] != 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
    str += (nArray[3] != 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
    str += (nArray[4] != 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
    str += (nArray[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) + 'only ' : 'only';
    return str;
  };
  return inWords(Math.floor(num));
};

// Helper: generate salary slip HTML
const generateSalarySlipHTML = (data) => {
  const { employee, month, monthLabel, attendance, salary, totalHoursWorked, holidays, netSalary } = data;
  const amountInWords = numberToWords(netSalary);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: #f5f5f5; 
          padding: 20px;
          color: #333;
        }
        .container { 
          max-width: 900px; 
          margin: 0 auto; 
          background: white; 
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Header */
        .header {
          background: linear-gradient(135deg, #1a1612 0%, #2d2420 100%);
          color: white;
          padding: 40px;
          text-align: center;
          border-bottom: 4px solid #c84b2f;
        }
        .company-name {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 3px;
          margin-bottom: 8px;
        }
        .company-name .x { color: #c84b2f; }
        .document-title {
          font-size: 14px;
          color: #aaa;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        
        /* Main Content */
        .content { padding: 40px; }
        
        /* Employee & Month Info */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #eee;
        }
        .info-group h3 {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          font-weight: 600;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-row .label { color: #666; }
        .info-row .value { font-weight: 600; color: #1a1612; }
        
        /* Attendance Section */
        .section-title {
          font-size: 13px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 30px;
          margin-bottom: 15px;
          font-weight: 700;
          padding-bottom: 10px;
          border-bottom: 2px solid #c84b2f;
        }
        
        .attendance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .att-card {
          background: #f9f7f4;
          border: 1px solid #e8e0d8;
          border-radius: 6px;
          padding: 15px;
          text-align: center;
        }
        .att-card .label {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .att-card .value {
          font-size: 24px;
          font-weight: 700;
          color: #1a1612;
        }
        
        /* Salary Table */
        .salary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .salary-table th {
          background: #f0ebe5;
          padding: 12px 15px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #d8d0c0;
        }
        .salary-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        .salary-table tr:nth-child(even) {
          background: #faf8f5;
        }
        .salary-table .label { color: #666; }
        .salary-table .amount { 
          text-align: right; 
          font-weight: 600;
          color: #1a1612;
          font-family: 'Courier New', monospace;
        }
        .salary-table .deduction { color: #c84b2f; }
        .salary-table .highlight {
          background: #1a1612 !important;
          color: white;
          font-weight: 700;
        }
        .salary-table .highlight .amount { color: #c84b2f; }
        
        /* Amount in Words */
        .amount-words {
          background: #f9f7f4;
          border-left: 4px solid #c84b2f;
          padding: 15px 20px;
          margin-bottom: 30px;
          border-radius: 4px;
        }
        .amount-words .label {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }
        .amount-words .value {
          font-size: 14px;
          font-weight: 600;
          color: #1a1612;
          letter-spacing: 0.5px;
        }
        
        /* Footer */
        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 50px;
          padding-top: 30px;
          border-top: 2px solid #eee;
        }
        .footer-note {
          font-size: 11px;
          color: #999;
          line-height: 1.6;
        }
        .signature-box {
          text-align: right;
        }
        .signature-box .label {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 60px;
          display: block;
        }
        .signature-box .sign-line {
          border-top: 1px solid #333;
          padding-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #1a1612;
        }
        
        /* Print Styles */
        @media print {
          body { background: white; padding: 0; }
          .container { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="company-name">ATTEND<span class="x">X</span></div>
          <div class="document-title">Salary Slip</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Employee & Month Info -->
          <div class="info-grid">
            <div class="info-group">
              <h3>Employee Information</h3>
              <div class="info-row">
                <span class="label">Name</span>
                <span class="value">${employee.name.toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="label">Employee Code</span>
                <span class="value">${employee.employeeCode}</span>
              </div>
              <div class="info-row">
                <span class="label">Designation</span>
                <span class="value">${employee.designation}</span>
              </div>
              <div class="info-row">
                <span class="label">Department</span>
                <span class="value">${employee.department || 'N/A'}</span>
              </div>
            </div>
            <div class="info-group">
              <h3>Salary Period</h3>
              <div class="info-row">
                <span class="label">Month</span>
                <span class="value">${monthLabel}</span>
              </div>
              <div class="info-row">
                <span class="label">Monthly CTC</span>
                <span class="value">₹ ${employee.monthlySalary.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          
          <!-- Attendance Summary -->
          <div class="section-title">Attendance Summary</div>
          <div class="attendance-grid">
            <div class="att-card">
              <div class="label">Working Days</div>
              <div class="value">${attendance.totalWorkingDays}</div>
            </div>
            <div class="att-card">
              <div class="label">Present</div>
              <div class="value">${attendance.present}</div>
            </div>
            <div class="att-card">
              <div class="label">Half Days</div>
              <div class="value">${attendance.halfDay}</div>
            </div>
            <div class="att-card">
              <div class="label">Absent</div>
              <div class="value">${attendance.absent}</div>
            </div>
            <div class="att-card">
              <div class="label">Weekly Offs</div>
              <div class="value">${attendance.weeklyOffs}</div>
            </div>
            <div class="att-card">
              <div class="label">Holidays</div>
              <div class="value">${attendance.holidayCount}</div>
            </div>
            <div class="att-card">
              <div class="label">Hours Worked</div>
              <div class="value">${totalHoursWorked.toFixed(1)}h</div>
            </div>
          </div>
          
          <!-- Salary Breakdown -->
          <div class="section-title">Salary Breakdown</div>
          <table class="salary-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label">Monthly CTC</td>
                <td class="amount">₹ ${employee.monthlySalary.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="label">Per Day Salary</td>
                <td class="amount">₹ ${salary.perDaySalary.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="label">Earned Days (Present + Half)</td>
                <td class="amount">${salary.earnedDays}</td>
              </tr>
              <tr>
                <td class="label">Gross Salary</td>
                <td class="amount">₹ ${salary.grossSalary.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="label deduction">Deduction (Absent Days)</td>
                <td class="amount deduction">- ₹ ${salary.deduction.toLocaleString('en-IN')}</td>
              </tr>
              <tr class="highlight">
                <td class="label">NET SALARY</td>
                <td class="amount">₹ ${netSalary.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Amount in Words -->
          <div class="amount-words">
            <div class="label">Amount in Words</div>
            <div class="value">RUPEES ${amountInWords.toUpperCase()}</div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-note">
              <strong>Note:</strong> This is a system-generated salary slip. For any discrepancies, please contact HR.<br><br>
              <strong>E. & O. E.</strong> — Subject to Lucknow Jurisdiction.
            </div>
            <div class="signature-box">
              <span class="label">Authorized By</span>
              <div class="sign-line">HR Manager</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper: get all dates in a month
const getDatesInMonth = (year, month) => {
  const days = new Date(year, month, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    const m = String(month).padStart(2, "0");
    return `${year}-${m}-${d}`;
  });
};

// GET /api/admin/salary/:employeeId?month=YYYY-MM
exports.getSalaryCalc = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "month required (YYYY-MM)" });

    const employee = await Employee.findOne({ _id: req.params.employeeId, adminId: req.user.id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const [year, mon] = month.split("-").map(Number);
    const allDates = getDatesInMonth(year, mon);

    // Fetch holidays for this month
    const holidays = await Holiday.find({ adminId: req.user.id, date: { $regex: `^${month}` } });
    const holidayDates = new Set(holidays.map(h => h.date));

    // Fetch attendance
    const records = await Attendance.find({ employeeId: employee._id, date: { $regex: `^${month}` } });
    const attMap = {};
    records.forEach(r => { attMap[r.date] = r; });

    let totalWorkingDays = 0, present = 0, absent = 0, halfDay = 0, weeklyOffs = 0, holidayCount = 0;
    let totalHoursWorked = 0;

    allDates.forEach(date => {
      const dayOfWeek = new Date(date).getDay();
      const isWeeklyOff = employee.weeklyOff.includes(dayOfWeek);
      const isHoliday   = holidayDates.has(date);

      if (isWeeklyOff) { weeklyOffs++; return; }
      if (isHoliday)   { holidayCount++; return; }

      totalWorkingDays++;
      const rec = attMap[date];
      if (!rec) { absent++; return; }

      if (rec.status === "present") { present++; }
      else if (rec.status === "half-day") { halfDay++; }
      else { absent++; }

      if (rec.checkIn?.time && rec.checkOut?.time) {
        totalHoursWorked += (new Date(rec.checkOut.time) - new Date(rec.checkIn.time)) / 3600000;
      }
    });

    // Salary calculation
    const perDaySalary   = employee.monthlySalary / totalWorkingDays || 0;
    const earnedDays     = present + halfDay * 0.5;
    const deductedDays   = absent;
    const grossSalary    = parseFloat((perDaySalary * earnedDays).toFixed(2));
    const deduction      = parseFloat((perDaySalary * deductedDays).toFixed(2));
    const netSalary      = parseFloat((grossSalary).toFixed(2));

    res.json({
      employee: {
        name: employee.name, employeeCode: employee.employeeCode,
        designation: employee.designation, department: employee.department,
        monthlySalary: employee.monthlySalary,
      },
      month, year, mon,
      attendance: { totalWorkingDays, present, halfDay, absent, weeklyOffs, holidayCount },
      salary: { perDaySalary: parseFloat(perDaySalary.toFixed(2)), earnedDays, deductedDays, grossSalary, deduction, netSalary },
      totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
      holidays: holidays.map(h => ({ name: h.name, date: h.date })),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/admin/salary/:employeeId/pdf?month=YYYY-MM
exports.downloadSalarySlip = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "month required" });

    const employee = await Employee.findOne({ _id: req.params.employeeId, adminId: req.user.id })
      .populate("officeId", "name");
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const [year, mon] = month.split("-").map(Number);
    const allDates = getDatesInMonth(year, mon);
    const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    const holidays = await Holiday.find({ adminId: req.user.id, date: { $regex: `^${month}` } });
    const holidayDates = new Set(holidays.map(h => h.date));

    const records = await Attendance.find({ employeeId: employee._id, date: { $regex: `^${month}` } });
    const attMap = {};
    records.forEach(r => { attMap[r.date] = r; });

    let totalWorkingDays = 0, present = 0, absent = 0, halfDay = 0, weeklyOffs = 0, holidayCount = 0, totalHours = 0;

    allDates.forEach(date => {
      const dayOfWeek = new Date(date).getDay();
      if (employee.weeklyOff.includes(dayOfWeek)) { weeklyOffs++; return; }
      if (holidayDates.has(date)) { holidayCount++; return; }
      totalWorkingDays++;
      const rec = attMap[date];
      if (!rec) { absent++; return; }
      if (rec.status === "present") present++;
      else if (rec.status === "half-day") halfDay++;
      else absent++;
      if (rec.checkIn?.time && rec.checkOut?.time)
        totalHours += (new Date(rec.checkOut.time) - new Date(rec.checkIn.time)) / 3600000;
    });

    const perDay    = employee.monthlySalary / (totalWorkingDays || 1);
    const earned    = present + halfDay * 0.5;
    const deducted  = absent;
    const gross     = parseFloat((perDay * earned).toFixed(2));
    const deduction = parseFloat((perDay * deducted).toFixed(2));
    const net       = gross;

    // Generate HTML
    const htmlContent = generateSalarySlipHTML({
      employee: { name: employee.name, employeeCode: employee.employeeCode, designation: employee.designation, department: employee.department, monthlySalary: employee.monthlySalary },
      month, monthLabel,
      attendance: { totalWorkingDays, present, halfDay, absent, weeklyOffs, holidayCount },
      salary: { perDaySalary: parseFloat(perDay.toFixed(2)), earnedDays: earned, deductedDays: deducted, grossSalary: gross, deduction },
      totalHoursWorked: parseFloat(totalHours.toFixed(2)),
      holidays,
      netSalary: net
    });

    // Convert HTML to PDF using puppeteer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: 10, right: 10, bottom: 10, left: 10 } });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=salary-slip-${employee.employeeCode}-${month}.pdf`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
