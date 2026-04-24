const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getEmployeesByAdmin, checkIn, checkOut,
  getAttendanceReport, getRangeReport,
  getEmployeeAttendance, getOfficeAttendance,
} = require("../controllers/attendanceController");

// Public
router.get("/employees/:adminId", getEmployeesByAdmin);
router.post("/checkin", checkIn);
router.post("/checkout", checkOut);

// Protected
router.get("/report/:adminId",       auth, role("admin"), getAttendanceReport);
router.get("/range/:adminId",        auth, role("admin"), getRangeReport);
router.get("/office/:officeId",      auth, role("admin"), getOfficeAttendance);
router.get("/employee/:employeeId",  auth, role("admin"), getEmployeeAttendance);

module.exports = router;
