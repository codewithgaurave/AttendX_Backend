const Employee = require("../models/Employee");

// POST /api/admin/employees
exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create({ ...req.body, adminId: req.user.id });
    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/employees
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ adminId: req.user.id, isActive: true })
      .populate("officeId", "name address lat long radius");
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/employees/:id
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, adminId: req.user.id })
      .populate("officeId");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.id },
      req.body,
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/employees/:id/working-hours
exports.updateWorkingHours = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.id },
      { workingHours: { startTime, endTime } },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Working hours updated", workingHours: employee.workingHours });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/employees/:id
exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: req.user.id },
      { isActive: false }
    );
    res.json({ message: "Employee deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
