const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const Admin = require("../models/Admin");
const Office = require("../models/Office");
const jwt = require('jsonwebtoken');
const pdf = require('html-pdf');
const { generateSalarySlipHTML, getDatesInMonth } = require("./salaryController");

// Generate fully calculated beautiful PDF slip instead of plain print HTML
exports.downloadSalarySlipHTML = async (req, res) => {
  console.log('=== CALCULATED SALARY SLIP PDF DOWNLOAD START ===');
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
      return res.status(400).send('<h1>Month parameter required (YYYY-MM format)</h1>');
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).send('<h1>Invalid month format. Use YYYY-MM</h1>');
    }

    console.log('Finding employee and admin...');
    const [employee, admin] = await Promise.all([
      Employee.findOne({ _id: req.params.employeeId, adminId }).populate("officeId", "name"),
      Admin.findById(adminId).select('companyName')
    ]);
    
    if (!employee) {
      return res.status(404).send('<h1>Employee not found</h1>');
    }

    if (!employee.monthlySalary || employee.monthlySalary <= 0) {
      return res.status(400).send('<h1>Employee salary not set. Please update employee salary first.</h1>');
    }

    const [year, mon] = month.split("-").map(Number);
    const allDates = getDatesInMonth(year, mon);
    const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    // Fetch holidays and attendance
    const holidays = await Holiday.find({ adminId, date: { $regex: `^${month}` } });
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

    // PDF options matching salaryController
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
        return res.status(500).send('<h1>Failed to generate PDF. Please try again.</h1>');
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=salary-slip-${employee.employeeCode}-${month}.pdf`);
      res.send(buffer);
    });
    
  } catch (err) {
    console.error('HTML slip error:', err);
    res.status(500).send('<h1>Error generating salary slip</h1>');
  }
};