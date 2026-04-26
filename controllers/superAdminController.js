const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const QRCode = require("qrcode");

// POST /api/superadmin/admins
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, companyName } = req.body;

    // Check SuperAdmin validity
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    // SuperAdmin can only create demo accounts with fixed settings
    const admin = await Admin.create({
      name, email, password, phone, companyName,
      createdBy: req.user.id,
      accountType: "demo", // Always demo
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Always 7 days
      maxEmployees: 5, // Fixed
      maxOffices: 1 // Fixed
    });

    // Generate QR with admin's ID (employee will scan this)
    const qrData = JSON.stringify({ adminId: admin._id, companyName });
    const qrCode = await QRCode.toDataURL(qrData);

    admin.qrCode = qrCode;
    await admin.save();

    res.status(201).json({ 
      message: "Demo admin created successfully", 
      admin: {
        ...admin.toObject(),
        password: undefined
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/admins
exports.getAllAdmins = async (req, res) => {
  try {
    // Check SuperAdmin validity
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true,
        accountType: superAdmin?.accountType,
        validUntil: superAdmin?.validUntil
      });
    }

    const admins = await Admin.find({ createdBy: req.user.id }).select("-password").sort({ createdAt: -1 });
    
    // Check validity for each admin
    for (let admin of admins) {
      await admin.checkValidity();
    }
    
    res.json({ 
      admins, 
      subscription: {
        accountType: superAdmin.accountType,
        validUntil: superAdmin.validUntil,
        maxAdmins: superAdmin.maxAdmins,
        isExpired: superAdmin.isExpired
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/subscription
exports.getSubscription = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id).select('-password');
    if (!superAdmin) {
      return res.status(404).json({ message: "Super admin not found" });
    }

    const currentAdmins = await Admin.countDocuments({ createdBy: req.user.id, isActive: true });
    const daysLeft = Math.ceil((new Date(superAdmin.validUntil) - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      accountType: superAdmin.accountType,
      validFrom: superAdmin.validFrom,
      validUntil: superAdmin.validUntil,
      daysLeft: Math.max(0, daysLeft),
      maxAdmins: superAdmin.maxAdmins,
      currentAdmins,
      isExpired: superAdmin.isExpired,
      isValid: superAdmin.isAccountValid,
      lastPaymentDate: superAdmin.lastPaymentDate,
      paymentAmount: superAdmin.paymentAmount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/superadmin/admins/:id/subscription
exports.updateAdminSubscription = async (req, res) => {
  try {
    const { accountType, validityDays, maxEmployees, maxOffices, paymentAmount, paymentMethod } = req.body;
    
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const admin = await Admin.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (accountType === 'paid') {
      admin.accountType = 'paid';
      admin.validUntil = new Date(Date.now() + (validityDays || 30) * 24 * 60 * 60 * 1000);
      admin.maxEmployees = maxEmployees || 50;
      admin.maxOffices = maxOffices || 5;
      admin.isExpired = false;
      admin.canScanAttendance = true;
      admin.lastPaymentDate = new Date();
      admin.paymentAmount = paymentAmount;
      admin.paymentMethod = paymentMethod;
    } else {
      admin.accountType = 'demo';
      admin.validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      admin.maxEmployees = 5;
      admin.maxOffices = 1;
      admin.isExpired = false;
      admin.canScanAttendance = true;
    }
    
    await admin.save();
    
    res.json({
      message: "Admin subscription updated successfully",
      admin: {
        id: admin._id,
        accountType: admin.accountType,
        validUntil: admin.validUntil,
        maxEmployees: admin.maxEmployees,
        maxOffices: admin.maxOffices,
        isExpired: admin.isExpired
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/admins/:id/details
exports.getAdminDetails = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const admin = await Admin.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    }).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Get employee and office counts
    const Employee = require('../models/Employee');
    const Office = require('../models/Office');
    
    const employeeCount = await Employee.countDocuments({ adminId: admin._id, isActive: true });
    const officeCount = await Office.countDocuments({ adminId: admin._id });
    
    const daysLeft = Math.ceil((new Date(admin.validUntil) - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      admin,
      stats: {
        employeeCount,
        officeCount,
        daysLeft: Math.max(0, daysLeft),
        isValid: admin.isAccountValid
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/superadmin/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const { password, ...rest } = req.body;
    const admin = await Admin.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      rest, 
      { new: true }
    ).select("-password");
    
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/superadmin/admins/:id/toggle
exports.toggleAdmin = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    
    admin.isActive = !admin.isActive;
    admin.canScanAttendance = admin.isActive;
    await admin.save();
    
    res.json({ message: `Admin ${admin.isActive ? "activated" : "deactivated"}`, isActive: admin.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/admins/:id/qr
exports.getAdminQR = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id })
      .select("qrCode name companyName canScanAttendance");
    
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    
    // Check admin validity
    const isValid = await admin.checkValidity();
    if (!isValid) {
      return res.status(403).json({ 
        message: "QR code disabled due to expired subscription",
        expired: true
      });
    }
    
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
