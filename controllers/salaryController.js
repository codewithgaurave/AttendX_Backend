const PDFDocument = require("pdfkit");
const Employee  = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday   = require("../models/Holiday");

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

    // Build PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=salary-slip-${employee.employeeCode}-${month}.pdf`);
    doc.pipe(res);

    const W = 515;
    const col = (x) => 40 + x;

    // Header bar
    doc.rect(40, 40, W, 60).fill("#1a1612");
    doc.fillColor("#f5f0e8").font("Helvetica-Bold").fontSize(22).text("AttendX", col(0), 52, { width: W / 2 });
    doc.fillColor("#c84b2f").text("X", col(0) + doc.widthOfString("Attend"), 52);
    doc.fillColor("#aaa").font("Helvetica").fontSize(10).text("Salary Slip", col(0), 76);
    doc.fillColor("#f5f0e8").font("Helvetica-Bold").fontSize(13).text(monthLabel, col(0), 76, { width: W, align: "right" });

    doc.fillColor("#1a1612");
    let y = 120;

    // Employee info box
    doc.rect(40, y, W, 80).stroke("#d8d0c0");
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1a1612").text("Employee Details", col(10), y + 10);
    doc.font("Helvetica").fontSize(10).fillColor("#5a5248");
    doc.text(`Name: ${employee.name}`,           col(10), y + 26);
    doc.text(`Code: ${employee.employeeCode}`,   col(10), y + 40);
    doc.text(`Designation: ${employee.designation}`, col(10), y + 54);
    doc.text(`Department: ${employee.department || "—"}`, col(200), y + 26);
    doc.text(`Office: ${employee.officeId?.name || "—"}`, col(200), y + 40);
    doc.text(`Month: ${monthLabel}`,             col(200), y + 54);
    y += 100;

    // Attendance summary
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1a1612").text("Attendance Summary", col(0), y);
    y += 16;
    const attRows = [
      ["Total Working Days", totalWorkingDays], ["Present", present],
      ["Half Day", halfDay], ["Absent", absent],
      ["Weekly Offs", weeklyOffs], ["Holidays", holidayCount],
      ["Total Hours Worked", `${totalHours.toFixed(1)}h`],
    ];
    attRows.forEach(([label, val], i) => {
      const bg = i % 2 === 0 ? "#f5f0e8" : "#ffffff";
      doc.rect(40, y, W, 18).fill(bg);
      doc.fillColor("#1a1612").font("Helvetica").fontSize(10).text(label, col(8), y + 4);
      doc.font("Helvetica-Bold").text(String(val), col(0), y + 4, { width: W - 10, align: "right" });
      y += 18;
    });
    y += 14;

    // Salary breakdown
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#1a1612").text("Salary Breakdown", col(0), y);
    y += 16;
    const salRows = [
      ["Monthly CTC", `₹ ${employee.monthlySalary.toLocaleString("en-IN")}`],
      ["Per Day Salary", `₹ ${perDay.toFixed(2)}`],
      ["Earned Days", earned],
      ["Gross Salary", `₹ ${gross.toLocaleString("en-IN")}`],
      ["Deduction (Absent)", `- ₹ ${deduction.toLocaleString("en-IN")}`],
    ];
    salRows.forEach(([label, val], i) => {
      const bg = i % 2 === 0 ? "#f5f0e8" : "#ffffff";
      doc.rect(40, y, W, 18).fill(bg);
      doc.fillColor("#1a1612").font("Helvetica").fontSize(10).text(label, col(8), y + 4);
      doc.font("Helvetica-Bold").text(String(val), col(0), y + 4, { width: W - 10, align: "right" });
      y += 18;
    });

    // Net salary highlight
    y += 6;
    doc.rect(40, y, W, 30).fill("#1a1612");
    doc.fillColor("#f5f0e8").font("Helvetica-Bold").fontSize(13).text("Net Salary", col(10), y + 8);
    doc.fillColor("#c84b2f").fontSize(14).text(`₹ ${net.toLocaleString("en-IN")}`, col(0), y + 8, { width: W - 10, align: "right" });
    y += 46;

    // Holidays this month
    if (holidays.length > 0) {
      doc.fillColor("#1a1612").font("Helvetica-Bold").fontSize(11).text("Holidays This Month", col(0), y);
      y += 14;
      holidays.forEach(h => {
        doc.font("Helvetica").fontSize(10).fillColor("#5a5248")
          .text(`• ${h.date}  —  ${h.name}`, col(8), y);
        y += 14;
      });
    }

    // Footer
    doc.rect(40, 780, W, 1).fill("#d8d0c0");
    doc.font("Helvetica").fontSize(9).fillColor("#aaa")
      .text("This is a system generated salary slip. — AttendX", 40, 788, { width: W, align: "center" });

    doc.end();
  } catch (err) { res.status(500).json({ message: err.message }); }
};
