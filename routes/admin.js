const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { createOffice, getOffices, updateOffice, deleteOffice, geocodeOfficeAddress, clearAllOffices } = require("../controllers/officeController");
const { createEmployee, getEmployees, getEmployee, updateEmployee, updateWorkingHours, deleteEmployee } = require("../controllers/employeeController");
const { getHolidays, createHoliday, updateHoliday, deleteHoliday } = require("../controllers/holidayController");
const { getSalaryCalc, downloadSalarySlip } = require("../controllers/salaryController");
const { requestRenewal, getRenewalStatus } = require("../controllers/renewalController");

router.use(auth, role("admin"));

// Office
router.post("/offices/geocode", geocodeOfficeAddress);
router.delete("/offices/clear-all", clearAllOffices);
router.post("/offices", createOffice);
router.get("/offices", getOffices);
router.put("/offices/:id", updateOffice);
router.delete("/offices/:id", deleteOffice);

// Employee
router.post("/employees", createEmployee);
router.get("/employees", getEmployees);
router.get("/employees/:id", getEmployee);
router.put("/employees/:id", updateEmployee);
router.patch("/employees/:id/working-hours", updateWorkingHours);
router.delete("/employees/:id", deleteEmployee);

// Holiday
router.get("/holidays", getHolidays);
router.post("/holidays", createHoliday);
router.put("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

// Salary
router.get("/salary/:employeeId", getSalaryCalc);
router.get("/salary/:employeeId/pdf", downloadSalarySlip);

// Renewal requests
router.post("/request-renewal", requestRenewal);
router.get("/renewal-status", getRenewalStatus);

module.exports = router;
