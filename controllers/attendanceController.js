const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const { checkGeofence } = require("../utils/geofence");

const today = () => new Date().toISOString().split("T")[0];

// "HH:MM" string → minutes since midnight
const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// minutes → "Xh Ym" string
const minsToHHMM = (mins) => {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${h}h ${m}m`;
};

// Calculate analysis for one attendance record
const analyzeAttendance = (record, employee) => {
  const ci = record.checkIn?.time ? new Date(record.checkIn.time) : null;
  const co = record.checkOut?.time ? new Date(record.checkOut.time) : null;

  const wh = employee.workingHours || { startTime: "09:00", endTime: "18:00" };
  const scheduledStart = timeToMinutes(wh.startTime);
  const scheduledEnd = timeToMinutes(wh.endTime);
  const scheduledHours = (scheduledEnd - scheduledStart) / 60;

  let analysis = {
    scheduledStart: wh.startTime,
    scheduledEnd: wh.endTime,
    scheduledHours: `${scheduledHours}h`,
    checkInTime: ci ? ci.toTimeString().slice(0, 5) : null,
    checkOutTime: co ? co.toTimeString().slice(0, 5) : null,
    hoursWorked: null,
    hoursWorkedDecimal: null,
    overtime: null,
    lateBy: null,
    earlyLeaveBy: null,
    isLate: false,
    isEarlyLeave: false,
    status: record.status,
  };

  if (ci) {
    const actualStart = ci.getHours() * 60 + ci.getMinutes();
    const lateBy = actualStart - scheduledStart;
    if (lateBy > 0) {
      analysis.isLate = true;
      analysis.lateBy = minsToHHMM(lateBy);
    }
  }

  if (ci && co) {
    const workedMins = Math.round((co - ci) / 1000 / 60);
    const workedHours = workedMins / 60;
    analysis.hoursWorked = minsToHHMM(workedMins);
    analysis.hoursWorkedDecimal = parseFloat(workedHours.toFixed(2));

    const actualEnd = co.getHours() * 60 + co.getMinutes();
    const earlyBy = scheduledEnd - actualEnd;
    if (earlyBy > 0) {
      analysis.isEarlyLeave = true;
      analysis.earlyLeaveBy = minsToHHMM(earlyBy);
    }

    const overtimeMins = workedMins - (scheduledEnd - scheduledStart);
    if (overtimeMins > 0) analysis.overtime = minsToHHMM(overtimeMins);

    // Status logic
    if (workedHours >= scheduledHours * 0.9) {
      analysis.status = "present";
    } else if (workedHours >= scheduledHours * 0.5) {
      analysis.status = "half-day";
    } else {
      analysis.status = "absent";
    }
  }

  return analysis;
};

// GET /api/attendance/employees/:adminId  → QR scan ke baad employee list
exports.getEmployeesByAdmin = async (req, res) => {
  try {
    const employees = await Employee.find({
      adminId: req.params.adminId,
      isActive: true,
    }).select("name employeeCode designation profilePhoto officeId");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance/checkin
exports.checkIn = async (req, res) => {
  try {
    const { employeeId, adminId, lat, long, selfie } = req.body;

    if (!lat || !long) return res.status(400).json({ message: "GPS location required" });

    const employee = await Employee.findById(employeeId).populate("officeId");
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const office = employee.officeId;
    const geo = await checkGeofence(lat, long, office.lat, office.long, office.radius);

    if (!geo.withinRadius) {
      return res.status(403).json({
        message: "You are outside the office zone",
        violation: geo.violation,
        distance: geo.distance,
        allowedRadius: geo.allowedRadius,
        yourLocation: geo.address,
      });
    }

    const date = today();
    const existing = await Attendance.findOne({ employeeId, date });
    if (existing?.checkIn?.time)
      return res.status(400).json({ message: "Already checked in today" });

    // Late check
    const now = new Date();
    const actualStart = now.getHours() * 60 + now.getMinutes();
    const scheduledStart = timeToMinutes(employee.workingHours?.startTime || "09:00");
    const lateBy = actualStart - scheduledStart;

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date },
      {
        adminId,
        officeId: office._id,
        date,
        checkIn: {
          time: now,
          selfie,
          lat: geo.snappedLat,
          long: geo.snappedLong,
          address: geo.address,
          withinRadius: geo.withinRadius,
          distance: geo.distance,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Check-in successful",
      withinRadius: geo.withinRadius,
      distance: geo.distance,
      location: geo.address,
      isLate: lateBy > 0,
      lateBy: lateBy > 0 ? minsToHHMM(lateBy) : null,
      scheduledStart: employee.workingHours?.startTime,
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance/checkout
exports.checkOut = async (req, res) => {
  try {
    const { employeeId, lat, long, selfie } = req.body;

    if (!lat || !long) return res.status(400).json({ message: "GPS location required" });

    const date = today();
    const attendance = await Attendance.findOne({ employeeId, date });

    if (!attendance?.checkIn?.time)
      return res.status(400).json({ message: "Check-in not done today" });
    if (attendance?.checkOut?.time)
      return res.status(400).json({ message: "Already checked out today" });

    const employee = await Employee.findById(employeeId).populate("officeId");
    const office = employee.officeId;
    const geo = await checkGeofence(lat, long, office.lat, office.long, office.radius);

    if (!geo.withinRadius) {
      return res.status(403).json({
        message: "You are outside the office zone",
        violation: geo.violation,
        distance: geo.distance,
        allowedRadius: geo.allowedRadius,
        yourLocation: geo.address,
      });
    }

    const now = new Date();
    attendance.checkOut = {
      time: now,
      selfie,
      lat: geo.snappedLat,
      long: geo.snappedLong,
      address: geo.address,
      withinRadius: geo.withinRadius,
      distance: geo.distance,
    };

    // Calculate analysis and update status
    const analysis = analyzeAttendance({ ...attendance.toObject(), checkOut: { time: now } }, employee);
    attendance.status = analysis.status;
    await attendance.save();

    res.json({
      message: "Check-out successful",
      withinRadius: geo.withinRadius,
      distance: geo.distance,
      location: geo.address,
      analysis,
      attendance,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/report/:adminId?date=YYYY-MM-DD
exports.getAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || today();

    const records = await Attendance.find({ adminId: req.params.adminId, date: reportDate })
      .populate("employeeId", "name employeeCode designation workingHours")
      .populate("officeId", "name");

    // All employees of this admin
    const allEmployees = await Employee.find({ adminId: req.params.adminId, isActive: true })
      .select("name employeeCode designation workingHours");

    const presentIds = new Set(records.map(r => r.employeeId?._id?.toString()));

    const report = records.map(rec => {
      const emp = rec.employeeId;
      const analysis = emp ? analyzeAttendance(rec, emp) : {};
      return {
        employeeId: emp?._id,
        name: emp?.name,
        employeeCode: emp?.employeeCode,
        designation: emp?.designation,
        office: rec.officeId?.name,
        date: rec.date,
        ...analysis,
        checkInLocation: rec.checkIn?.address,
        checkOutLocation: rec.checkOut?.address,
        checkInSelfie: rec.checkIn?.selfie || null,
        checkOutSelfie: rec.checkOut?.selfie || null,
        checkInDistance: rec.checkIn?.distance || null,
        checkOutDistance: rec.checkOut?.distance || null,
      };
    });

    // Absent employees
    const absent = allEmployees
      .filter(e => !presentIds.has(e._id.toString()))
      .map(e => ({
        employeeId: e._id,
        name: e.name,
        employeeCode: e.employeeCode,
        designation: e.designation,
        date: reportDate,
        status: "absent",
        checkInTime: null,
        checkOutTime: null,
        hoursWorked: null,
      }));

    const summary = {
      date: reportDate,
      total: allEmployees.length,
      present: report.filter(r => r.status === "present").length,
      halfDay: report.filter(r => r.status === "half-day").length,
      absent: absent.length + report.filter(r => r.status === "absent").length,
      late: report.filter(r => r.isLate).length,
      stillWorking: report.filter(r => r.checkInTime && !r.checkOutTime).length,
    };

    res.json({ summary, present: report, absent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/range/:adminId?from=YYYY-MM-DD&to=YYYY-MM-DD&employeeId=optional
exports.getRangeReport = async (req, res) => {
  try {
    const { from, to, employeeId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to dates required" });

    const filter = { adminId: req.params.adminId, date: { $gte: from, $lte: to } };
    if (employeeId) filter.employeeId = employeeId;

    const records = await Attendance.find(filter)
      .populate("employeeId", "name employeeCode designation workingHours")
      .sort({ date: 1 });

    const allEmployees = await Employee.find({ adminId: req.params.adminId, isActive: true })
      .select("name employeeCode designation workingHours");

    // Build date list between from and to
    const dates = [];
    let cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) { dates.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate() + 1); }

    // Group records by date
    const byDate = {};
    records.forEach(rec => {
      if (!byDate[rec.date]) byDate[rec.date] = [];
      const emp = rec.employeeId;
      const analysis = emp ? analyzeAttendance(rec, emp) : {};
      byDate[rec.date].push({
        employeeId: emp?._id,
        name: emp?.name,
        employeeCode: emp?.employeeCode,
        designation: emp?.designation,
        date: rec.date,
        ...analysis,
        checkInLocation: rec.checkIn?.address,
        checkOutLocation: rec.checkOut?.address,
      });
    });

    // Build per-day summary
    const dailySummary = dates.map(date => {
      const presentRecs = byDate[date] || [];
      const presentIds = new Set(presentRecs.map(r => r.employeeId?.toString()));
      const absentCount = allEmployees.filter(e => !presentIds.has(e._id.toString())).length;
      return {
        date,
        present: presentRecs.filter(r => r.status === "present").length,
        halfDay: presentRecs.filter(r => r.status === "half-day").length,
        absent: absentCount + presentRecs.filter(r => r.status === "absent").length,
        late: presentRecs.filter(r => r.isLate).length,
        records: presentRecs,
      };
    });

    // Overall summary
    const allRecords = Object.values(byDate).flat();
    const overallSummary = {
      totalDays: dates.length,
      totalPresent: allRecords.filter(r => r.status === "present").length,
      totalHalfDay: allRecords.filter(r => r.status === "half-day").length,
      totalLate: allRecords.filter(r => r.isLate).length,
      totalHoursWorked: parseFloat(allRecords.reduce((s, r) => s + (r.hoursWorkedDecimal || 0), 0).toFixed(2)),
    };

    res.json({ from, to, overallSummary, dailySummary, employees: allEmployees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/office/:officeId?date=YYYY-MM-DD
exports.getOfficeAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || today();

    const officeEmployees = await Employee.find({ officeId: req.params.officeId, isActive: true })
      .select("name employeeCode designation workingHours officeId");

    const records = await Attendance.find({ officeId: req.params.officeId, date: reportDate })
      .populate("employeeId", "name employeeCode designation workingHours");

    const presentIds = new Set(records.map(r => r.employeeId?._id?.toString()));

    const present = records.map(rec => {
      const emp = rec.employeeId;
      const analysis = emp ? analyzeAttendance(rec, emp) : {};
      return { employeeId: emp?._id, name: emp?.name, employeeCode: emp?.employeeCode, designation: emp?.designation, date: rec.date, ...analysis };
    });

    const absent = officeEmployees
      .filter(e => !presentIds.has(e._id.toString()))
      .map(e => ({ employeeId: e._id, name: e.name, employeeCode: e.employeeCode, designation: e.designation, status: "absent" }));

    res.json({
      summary: {
        total: officeEmployees.length,
        present: present.filter(r => r.status === "present").length,
        halfDay: present.filter(r => r.status === "half-day").length,
        absent: absent.length + present.filter(r => r.status === "absent").length,
        late: present.filter(r => r.isLate).length,
      },
      present, absent,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/attendance/employee/:employeeId?month=YYYY-MM
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const filter = { employeeId: req.params.employeeId };
    if (month) filter.date = { $regex: `^${month}` };

    const records = await Attendance.find(filter).sort({ date: -1 });

    const analyzed = records.map(rec => {
      const analysis = analyzeAttendance(rec, employee);
      return {
        date: rec.date,
        ...analysis,
        checkInLocation: rec.checkIn?.address,
        checkOutLocation: rec.checkOut?.address,
      };
    });

    // Monthly summary
    const summary = {
      totalDays: analyzed.length,
      present: analyzed.filter(r => r.status === "present").length,
      halfDay: analyzed.filter(r => r.status === "half-day").length,
      absent: analyzed.filter(r => r.status === "absent").length,
      lateDays: analyzed.filter(r => r.isLate).length,
      totalHoursWorked: parseFloat(
        analyzed.reduce((sum, r) => sum + (r.hoursWorkedDecimal || 0), 0).toFixed(2)
      ),
      averageHoursPerDay: analyzed.length
        ? parseFloat(
            (analyzed.reduce((sum, r) => sum + (r.hoursWorkedDecimal || 0), 0) / analyzed.length).toFixed(2)
          )
        : 0,
    };

    res.json({ employee: { name: employee.name, code: employee.employeeCode, workingHours: employee.workingHours }, summary, records: analyzed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
