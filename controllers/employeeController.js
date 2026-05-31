const Employee = require("../models/Employee");
const Admin = require("../models/Admin");
const { ObjectId } = require("mongodb");

// POST /api/admin/employees
exports.createEmployee = async (req, res) => {
  try {
    // Check admin validity and limits
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if admin account is valid
    const isValid = admin.isActive && !admin.isExpired && new Date() <= admin.validUntil;
    if (!isValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true
      });
    }

    const currentEmployees = await Employee.countDocuments({ adminId: req.user.id, isActive: true });
    if (currentEmployees >= admin.maxEmployees) {
      return res.status(400).json({ 
        message: `Maximum ${admin.maxEmployees} employees allowed for your ${admin.accountType} account. Current: ${currentEmployees}/${admin.maxEmployees}`,
        limitReached: true,
        currentCount: currentEmployees,
        maxAllowed: admin.maxEmployees,
        accountType: admin.accountType
      });
    }

    // Check if employee code already exists
    const existingEmployee = await Employee.findOne({ 
      adminId: req.user.id, 
      employeeCode: req.body.employeeCode 
    });
    
    if (existingEmployee) {
      return res.status(400).json({ 
        message: `Employee code "${req.body.employeeCode}" already exists. Please use a different employee code.`
      });
    }

    // Validate 4-digit numeric PIN
    if (!req.body.pin || req.body.pin.length !== 4 || !/^\d+$/.test(req.body.pin)) {
      return res.status(400).json({ 
        message: "A 4-digit numeric PIN is required for creating a new employee."
      });
    }

    const employee = await Employee.create({ ...req.body, adminId: req.user.id });
    res.status(201).json(employee);
  } catch (err) {
    console.error('Employee creation error:', err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[1]; // Get the duplicate field
      const value = err.keyValue[field];
      return res.status(400).json({ 
        message: `${field === 'employeeCode' ? 'Employee code' : field} "${value}" already exists. Please use a different value.`
      });
    }
    
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/employees
exports.getEmployees = async (req, res) => {
  try {
    // Check admin validity
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if admin account is valid
    const isValid = admin.isActive && !admin.isExpired && new Date() <= admin.validUntil;
    if (!isValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please renew your subscription.",
        expired: true,
        accountType: admin.accountType,
        validUntil: admin.validUntil
      });
    }

    console.log('getEmployees - adminId:', req.user.id, 'type:', typeof req.user.id);
    const employees = await Employee.find({ 
      adminId: new ObjectId(req.user.id), 
      isActive: true 
    }).populate("officeId", "name address lat long radius");
    console.log('Found employees:', employees.length);
    
    res.json({ 
      employees, 
      subscription: {
        accountType: admin.accountType,
        validUntil: admin.validUntil,
        maxEmployees: admin.maxEmployees,
        currentEmployees: employees.length,
        isExpired: admin.isExpired
      }
    });
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/employees/:id
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, adminId: new ObjectId(req.user.id) })
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
    const { pin } = req.body;
    let updateData = { ...req.body };

    if (pin) {
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "4-digit numeric PIN is required" });
      }

      const currentEmp = await Employee.findOne({ _id: req.params.id, adminId: new ObjectId(req.user.id) });
      if (currentEmp && currentEmp.pin !== pin) {
        updateData.isPinVerified = false; // Reset verification status since PIN changed
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      updateData,
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
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { workingHours: { startTime, endTime } },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Working hours updated", workingHours: employee.workingHours });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/employees/:id/deactivate
exports.deactivateEmployee = async (req, res) => {
  try {
    await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { isActive: false }
    );
    res.json({ message: "Employee deactivated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/employees/:id/activate
exports.activateEmployee = async (req, res) => {
  try {
    await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { isActive: true }
    );
    res.json({ message: "Employee activated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/employees/:id - Soft delete (move to bin)
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { isActive: false, isDeleted: true },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee moved to bin" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/employees/deleted - Get deleted employees (bin)
exports.getDeletedEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ adminId: new ObjectId(req.user.id), isDeleted: true })
      .populate("officeId", "name address lat long radius")
      .sort({ isDeleted: -1, createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/employees/:id/permanent - Permanently delete from bin (requires password)
exports.permanentDeleteEmployee = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const employee = await Employee.findOneAndDelete({
      _id: req.params.id,
      adminId: new ObjectId(req.user.id),
      isDeleted: true
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found in bin' });

    res.json({ message: 'Employee permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/employees/:id/restore - Restore employee from bin
exports.restoreEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { isActive: true, isDeleted: false },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee restored" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/superadmin-contact - Get SuperAdmin contact info
exports.getSuperAdminContact = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).populate('createdBy', 'name phone email company');
    
    if (!admin || !admin.createdBy) {
      return res.status(404).json({ message: "SuperAdmin contact not found" });
    }
    
    res.json({
      name: admin.createdBy.name,
      phone: admin.createdBy.phone,
      email: admin.createdBy.email,
      company: admin.createdBy.company
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/employees/:id/reset-pin
exports.resetPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ message: "4-digit numeric PIN is required" });
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, adminId: new ObjectId(req.user.id) },
      { pin, isPinVerified: false },
      { new: true }
    );

    if (!employee) return res.status(404).json({ message: "Employee not found" });

    res.json({ message: "PIN reset successful. Employee status reset to unverified.", employee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

