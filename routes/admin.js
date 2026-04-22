const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  createOffice, getOffices, updateOffice, deleteOffice, geocodeOfficeAddress,
} = require("../controllers/officeController");
const {
  createEmployee, getEmployees, getEmployee,
  updateEmployee, updateWorkingHours, deleteEmployee,
} = require("../controllers/employeeController");

router.use(auth, role("admin"));

// Office routes
router.post("/offices/geocode", geocodeOfficeAddress); // address → lat/long
router.post("/offices", createOffice);
router.get("/offices", getOffices);
router.put("/offices/:id", updateOffice);
router.delete("/offices/:id", deleteOffice);

// Employee routes
router.post("/employees", createEmployee);
router.get("/employees", getEmployees);
router.get("/employees/:id", getEmployee);
router.put("/employees/:id", updateEmployee);
router.patch("/employees/:id/working-hours", updateWorkingHours);
router.delete("/employees/:id", deleteEmployee);

module.exports = router;
