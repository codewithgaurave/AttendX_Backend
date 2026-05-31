const puppeteer = require("puppeteer");
const pdf = require('html-pdf');
const Employee  = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday   = require("../models/Holiday");
const Admin     = require("../models/Admin");

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
  const { employee, companyName, month, monthLabel, attendance, salary, totalHoursWorked, holidays, netSalary } = data;
  const amountInWords = numberToWords(netSalary);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, Helvetica, sans-serif;
          background: white;
          color: #333;
          font-size: 11px;
          line-height: 1.3;
        }
        .container { 
          width: 100%;
          background: white;
          padding: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: #1a1612; color: white; border-bottom: 3px solid #c84b2f; margin-bottom: 15px;">
          <tr>
            <td style="padding: 12px 18px; vertical-align: middle;">
              <div style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${companyName.toUpperCase()}</div>
              <div style="font-size: 10px; color: #bbb; letter-spacing: 3px; text-transform: uppercase; margin-top: 3px; font-weight: bold;">Salary Slip</div>
            </td>
            <td style="padding: 12px 18px; text-align: right; vertical-align: middle; color: #ccc; font-size: 11px;">
              <div style="font-weight: bold; color: white; font-size: 13px;">${monthLabel}</div>
              <div style="font-size: 9px; margin-top: 4px; color: #999;">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
            </td>
          </tr>
        </table>

        <!-- Info Section -->
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 48%; vertical-align: top;">
              <div style="font-size: 10px; color: #c84b2f; text-transform: uppercase; font-weight: bold; border-bottom: 1.5px solid #c84b2f; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 1px;">Employee Information</div>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Name</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">${employee.name.toUpperCase()}</td>
                </tr>
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Employee Code</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">${employee.employeeCode}</td>
                </tr>
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Designation</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">${employee.designation}</td>
                </tr>
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Department</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">${employee.department || 'N/A'}</td>
                </tr>
              </table>
            </td>
            <td style="width: 4%;"></td>
            <td style="width: 48%; vertical-align: top;">
              <div style="font-size: 10px; color: #c84b2f; text-transform: uppercase; font-weight: bold; border-bottom: 1.5px solid #c84b2f; padding-bottom: 4px; margin-bottom: 6px; letter-spacing: 1px;">Salary Period</div>
              <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Month</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">${monthLabel}</td>
                </tr>
                <tr style="border-bottom: 1px dotted #e0dcd5;">
                  <td style="padding: 5px 0; color: #666; font-size: 11px;">Monthly CTC</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #1a1612; font-size: 11px; text-align: right;">&#8377; ${employee.monthlySalary.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Attendance Summary -->
        <div style="font-size: 10px; color: #c84b2f; text-transform: uppercase; font-weight: bold; border-bottom: 1.5px solid #c84b2f; padding-bottom: 4px; margin-bottom: 8px; letter-spacing: 1px;">Attendance Summary</div>
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
          <tr>
            <td style="background: #f9f7f4; border: 1px solid #e8e0d8; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #7a6e65; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Working Days</div>
              <div style="font-size: 16px; font-weight: bold; color: #1a1612;">${attendance.totalWorkingDays}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #eef7f2; border: 1px solid #d0ebd9; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #3b7a57; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Present</div>
              <div style="font-size: 16px; font-weight: bold; color: #1e5a38;">${attendance.present}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #fdf8eb; border: 1px solid #f9ebc4; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #a37f26; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Half Days</div>
              <div style="font-size: 16px; font-weight: bold; color: #8a6616;">${attendance.halfDay}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #fdf2f2; border: 1px solid #fbd5d5; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #b83a21; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Absent</div>
              <div style="font-size: 16px; font-weight: bold; color: #9b2c2c;">${attendance.absent}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #f0f4f8; border: 1px solid #d6e4f0; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #3b6d8d; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Weekly Offs</div>
              <div style="font-size: 16px; font-weight: bold; color: #224d70;">${attendance.weeklyOffs}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #15803d; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Holidays</div>
              <div style="font-size: 16px; font-weight: bold; color: #15803d;">${attendance.holidayCount}</div>
            </td>
            <td style="width: 5px;"></td>
            <td style="background: #f5f3f7; border: 1px solid #e3deea; border-radius: 4px; padding: 8px 2px; text-align: center; width: 13.5%;">
              <div style="font-size: 8px; color: #6b4ba3; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; letter-spacing: 0.3px;">Hours Worked</div>
              <div style="font-size: 16px; font-weight: bold; color: #4f2e82;">${totalHoursWorked.toFixed(1)}h</div>
            </td>
          </tr>
        </table>

        <!-- Salary Breakdown -->
        <div style="font-size: 10px; color: #c84b2f; text-transform: uppercase; font-weight: bold; border-bottom: 1.5px solid #c84b2f; padding-bottom: 4px; margin-bottom: 8px; letter-spacing: 1px;">Salary Breakdown</div>
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f0ebe5; border-bottom: 2px solid #d8d0c0;">
              <th style="padding: 7px 10px; text-align: left; font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px; width: 65%;">Particulars</th>
              <th style="padding: 7px 10px; text-align: right; font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px; width: 35%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee; background: #faf8f5;">
              <td style="padding: 7px 10px; font-size: 11px; color: #333;">Monthly CTC</td>
              <td style="padding: 7px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1a1612;">&#8377; ${employee.monthlySalary.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-size: 11px; color: #333;">Per Day Salary</td>
              <td style="padding: 7px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1a1612;">&#8377; ${salary.perDaySalary.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee; background: #faf8f5;">
              <td style="padding: 7px 10px; font-size: 11px; color: #333;">Earned Days (Present + Half Day)</td>
              <td style="padding: 7px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1a1612;">${salary.earnedDays}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-size: 11px; color: #333;">Gross Salary</td>
              <td style="padding: 7px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #1a1612;">&#8377; ${salary.grossSalary.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee; background: #faf8f5;">
              <td style="padding: 7px 10px; font-size: 11px; color: #c84b2f; font-weight: 500;">Deduction (Absent Days: ${salary.deductedDays})</td>
              <td style="padding: 7px 10px; font-size: 11px; text-align: right; font-weight: bold; color: #c84b2f;">- &#8377; ${salary.deduction.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
            <tr style="background: #1a1612;">
              <td style="padding: 9px 10px; font-size: 12px; font-weight: bold; color: white;">NET SALARY</td>
              <td style="padding: 9px 10px; font-size: 13px; font-weight: bold; text-align: right; color: #c84b2f;">&#8377; ${netSalary.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        <!-- Amount in Words -->
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="background: #f9f7f4; border-left: 3px solid #c84b2f; padding: 8px 12px; border-radius: 2px;">
              <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; font-weight: bold;">Amount in Words</div>
              <div style="font-size: 11px; font-weight: bold; color: #1a1612;">RUPEES ${amountInWords.toUpperCase()}</div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 15px; border-top: 1px solid #eee;">
          <tr>
            <td style="width: 60%; vertical-align: top; padding-top: 10px; font-size: 9px; color: #888; line-height: 1.4;">
              <strong>Note:</strong> This is a system-generated salary slip. For any discrepancies or clarifications, please contact the HR department.
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top; padding-top: 10px;">
              <div style="font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 22px; font-weight: bold;">Authorized Signature</div>
              <div style="border-top: 1px solid #333; display: inline-block; width: 140px; padding-top: 5px; font-size: 10px; font-weight: bold; color: #1a1612; text-align: center;">
                HR Manager
              </div>
            </td>
          </tr>
        </table>
        
        <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #bbb; letter-spacing: 1px;">
          Powered by <strong style="color: #c84b2f;">AttenZo</strong> &mdash; Attendance Management System
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
  console.log('=== SALARY SLIP DOWNLOAD START ===');
  console.log('Employee ID:', req.params.employeeId);
  console.log('Month:', req.query.month);
  console.log('Admin ID:', req.user.id);
  
  try {
    const { month } = req.query;
    if (!month) {
      console.log('ERROR: Month not provided');
      return res.status(400).json({ message: "month required (YYYY-MM format)" });
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      console.log('ERROR: Invalid month format:', month);
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
    }

    console.log('Finding employee...');
    const [employee, admin] = await Promise.all([
      Employee.findOne({ _id: req.params.employeeId, adminId: req.user.id }).populate("officeId", "name"),
      Admin.findById(req.user.id).select('companyName')
    ]);
    
    if (!employee) {
      console.log('ERROR: Employee not found');
      return res.status(404).json({ message: "Employee not found" });
    }
    
    console.log('Employee found:', employee.name, 'Salary:', employee.monthlySalary);

    // Check if employee has salary set
    if (!employee.monthlySalary || employee.monthlySalary <= 0) {
      console.log('ERROR: Employee salary not set');
      return res.status(400).json({ message: "Employee salary not set. Please update employee salary first." });
    }

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
      employee: { 
        name: employee.name, 
        employeeCode: employee.employeeCode, 
        designation: employee.designation, 
        department: employee.department || 'N/A', 
        monthlySalary: employee.monthlySalary 
      },
      companyName: admin?.companyName || 'Company',
      month, monthLabel,
      attendance: { totalWorkingDays, present, halfDay, absent, weeklyOffs, holidayCount },
      salary: { perDaySalary: parseFloat(perDay.toFixed(2)), earnedDays: earned, deductedDays: deducted, grossSalary: gross, deduction },
      totalHoursWorked: parseFloat(totalHours.toFixed(2)),
      holidays,
      netSalary: net
    });

    // Convert HTML to PDF using html-pdf (fallback)
    const options = {
      format: 'A4',
      border: {
        top: "0.3in",
        right: "0.4in",
        bottom: "0.3in",
        left: "0.4in"
      },
      zoomFactor: '0.85'
    };

    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ message: "Failed to generate PDF. Please try again." });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=salary-slip-${employee.employeeCode}-${month}.pdf`);
      res.send(buffer);
    });
  } catch (err) { 
    console.error('Salary slip error:', err);
    res.status(500).json({ message: err.message || "Internal server error" }); 
  }
};

// Export helper functions for other controllers to reuse
exports.generateSalarySlipHTML = generateSalarySlipHTML;
exports.getDatesInMonth = getDatesInMonth;
exports.numberToWords = numberToWords;
