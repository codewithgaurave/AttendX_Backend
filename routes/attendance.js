const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getEmployeesByAdmin,
  checkIn,
  checkOut,
  getAttendanceReport,
  getRangeReport,
  getEmployeeAttendance,
} = require("../controllers/attendanceController");

// Public - QR scan karne ke baad (no auth needed)
router.get("/employees/:adminId", getEmployeesByAdmin);
router.post("/checkin", checkIn);
router.post("/checkout", checkOut);

// Protected - Admin reports
router.get("/report/:adminId", auth, role("admin"), getAttendanceReport);
router.get("/range/:adminId", auth, role("admin"), getRangeReport);
router.get("/employee/:employeeId", auth, role("admin"), getEmployeeAttendance);

module.exports = router;
