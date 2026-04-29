const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { createOffice, getOffices, updateOffice, deleteOffice, geocodeOfficeAddress, clearAllOffices } = require("../controllers/officeController");
const { createEmployee, getEmployees, getEmployee, updateEmployee, updateWorkingHours, deleteEmployee, deactivateEmployee, activateEmployee } = require("../controllers/employeeController");
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
router.patch("/employees/:id/deactivate", deactivateEmployee);
router.patch("/employees/:id/activate", activateEmployee);
router.delete("/employees/:id", deleteEmployee);

// Holiday
router.get("/holidays", getHolidays);
router.post("/holidays", createHoliday);
router.put("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

// Salary
router.get("/salary/:employeeId", getSalaryCalc);
router.get("/salary/:employeeId/pdf", downloadSalarySlip);

// Test endpoint for debugging
router.get("/test-pdf", (req, res) => {
  console.log('Test PDF endpoint hit');
  res.json({ message: "PDF endpoint working", timestamp: new Date() });
});

// Simple PDF test endpoint
router.get("/test-pdf-download", (req, res) => {
  const pdf = require('html-pdf');
  
  const html = `
    <html>
    <body>
      <h1>Test Salary Slip</h1>
      <p>Employee: Test Employee</p>
      <p>Month: December 2024</p>
      <p>Salary: ₹30,000</p>
    </body>
    </html>
  `;
  
  const options = { format: 'A4' };
  
  pdf.create(html, options).toBuffer((err, buffer) => {
    if (err) {
      console.error('Test PDF error:', err);
      return res.status(500).json({ message: "PDF generation failed" });
    }
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=test-slip.pdf");
    res.send(buffer);
  });
});

// Renewal requests
router.post("/request-renewal", requestRenewal);
router.get("/renewal-status", getRenewalStatus);

module.exports = router;
