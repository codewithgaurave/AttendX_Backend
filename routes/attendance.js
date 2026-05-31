const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getEmployeesByAdmin, checkIn, checkOut, smartAttendance,
  getAttendanceReport, getRangeReport,
  getEmployeeAttendance, getOfficeAttendance,
  markAttendance, forceCheckout,
  verifyPin, getEmployeeInfo
} = require("../controllers/attendanceController");

// Public
router.get("/employees/:adminId", getEmployeesByAdmin);
router.post("/checkin", checkIn);
router.post("/checkout", checkOut);
router.post("/smart", smartAttendance);
router.post("/verify-pin", verifyPin);
router.get("/employee-info/:employeeId", getEmployeeInfo);

router.post("/force-checkout",   auth, role("admin"), forceCheckout);

// Protected
router.get("/report/:adminId",       auth, role("admin"), getAttendanceReport);
router.get("/range/:adminId",        auth, role("admin"), getRangeReport);
router.get("/office/:officeId",      auth, role("admin"), getOfficeAttendance);
router.get("/employee/:employeeId",  auth, role("admin"), getEmployeeAttendance);
router.post("/mark",                 auth, role("admin"), markAttendance);

module.exports = router;
