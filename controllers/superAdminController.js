const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const QRCode = require("qrcode");

// PATCH /api/superadmin/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    
    if (phone.length < 10) {
      return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }
    
    if (email && !email.includes('@')) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin) {
      return res.status(404).json({ message: "Super admin not found" });
    }
    
    // Check if phone or email already exists (excluding current superAdmin)
    const existingCheck = {};
    if (phone !== superAdmin.phone) {
      existingCheck.phone = phone;
    }
    if (email && email !== superAdmin.email) {
      existingCheck.email = email;
    }
    
    if (Object.keys(existingCheck).length > 0) {
      const existing = await SuperAdmin.findOne({
        _id: { $ne: req.user.id },
        $or: Object.entries(existingCheck).map(([key, value]) => ({ [key]: value }))
      });
      
      if (existing) {
        return res.status(400).json({ message: "Phone number or email already exists" });
      }
    }
    
    // Update SuperAdmin profile
    superAdmin.name = name;
    superAdmin.email = email || '';
    superAdmin.phone = phone;
    superAdmin.company = company || '';
    
    await superAdmin.save();
    
    res.json({
      message: "Profile updated successfully",
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        phone: superAdmin.phone,
        company: superAdmin.company,
        role: 'superadmin'
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/superadmin/admins
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, companyName, validUntil, maxEmployees, maxOffices, validityDays } = req.body;

    if (!name || !phone || !password || !companyName) {
      return res.status(400).json({ message: "Name, phone, password, and company name are required" });
    }

    // Check SuperAdmin validity
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    // Check admin creation limit
    const currentAdmins = await Admin.countDocuments({ createdBy: req.user.id, isActive: true });
    if (currentAdmins >= superAdmin.maxAdmins) {
      return res.status(400).json({ 
        message: `Maximum ${superAdmin.maxAdmins} admins allowed. Contact Master Admin to increase limit.`,
        limitReached: true
      });
    }

    const exists = await Admin.findOne({ phone });
    if (exists) return res.status(400).json({ message: "Phone number already exists" });

    // Calculate validity date
    let adminValidUntil;
    if (validUntil) {
      adminValidUntil = new Date(validUntil);
    } else if (validityDays) {
      adminValidUntil = new Date(Date.now() + parseInt(validityDays) * 24 * 60 * 60 * 1000);
    } else {
      adminValidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    // SuperAdmin can only create Demo accounts but with custom limits
    const admin = await Admin.create({
      name, 
      email: email || null, 
      password, 
      plainPassword: password, // Store plain password for display
      phone, 
      companyName,
      createdBy: req.user.id,
      accountType: "demo", // Always demo for SuperAdmin
      validFrom: new Date(),
      validUntil: adminValidUntil,
      maxEmployees: parseInt(maxEmployees) || 5,
      maxOffices: parseInt(maxOffices) || 1
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

    const admins = await Admin.find({ createdBy: req.user.id })
      .select("-password")
      .populate('renewalRejectedBy', 'name email')
      .sort({ createdAt: -1 });
    
    // Check validity for each admin and calculate demo usage
    const adminsWithDemoUsage = [];
    for (let admin of admins) {
      await admin.checkValidity();
      
      // Calculate demo days used manually
      let totalDemoUsed = 0;
      if (admin.accountType === 'demo' || !admin.accountType) {
        const startDate = admin.validFrom || admin.createdAt;
        const currentDate = new Date();
        const endDate = admin.validUntil < currentDate ? admin.validUntil : currentDate;
        totalDemoUsed = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        totalDemoUsed = Math.max(0, totalDemoUsed);
      }
      
      const adminObj = admin.toObject();
      adminObj.totalDemoUsed = totalDemoUsed;
      adminsWithDemoUsage.push(adminObj);
    }
    
    res.json({ 
      admins: adminsWithDemoUsage, 
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
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const { validUntil, maxEmployees, maxOffices } = req.body;
    
    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // SuperAdmin can only update validity, employees, and offices - NOT account type
    if (validUntil) {
      admin.validUntil = new Date(validUntil);
      admin.isExpired = new Date() > new Date(validUntil);
      admin.canScanAttendance = !admin.isExpired;
    }
    
    if (maxEmployees !== undefined) {
      admin.maxEmployees = Math.max(1, parseInt(maxEmployees));
    }
    
    if (maxOffices !== undefined) {
      admin.maxOffices = Math.max(1, parseInt(maxOffices));
    }
    
    // Account type remains as is - SuperAdmin cannot change it
    // Only Master Admin can upgrade to paid accounts

    await admin.save();
    
    res.json({ 
      message: "Admin settings updated successfully",
      admin: {
        ...admin.toObject(),
        password: undefined
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

    const { name, email, phone, companyName, validUntil, maxEmployees, maxOffices } = req.body;

    if (!name || !phone || !companyName) {
      return res.status(400).json({ message: "Name, phone, and company name are required" });
    }

    if (phone.length < 10) {
      return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }

    if (email && !email.includes('@')) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Check if phone number already exists for another admin
    if (phone !== admin.phone) {
      const exists = await Admin.findOne({ phone, _id: { $ne: admin._id } });
      if (exists) return res.status(400).json({ message: "Phone number already exists" });
    }

    // Update fields
    admin.name = name;
    admin.email = email || null;
    admin.phone = phone;
    
    // If company name changed, update and re-generate QR code
    if (companyName !== admin.companyName) {
      admin.companyName = companyName;
      const qrData = JSON.stringify({ adminId: admin._id, companyName });
      admin.qrCode = await QRCode.toDataURL(qrData);
    }

    if (validUntil) {
      admin.validUntil = new Date(validUntil);
      admin.isExpired = new Date() > new Date(validUntil);
      admin.canScanAttendance = !admin.isExpired;
    }
    
    if (maxEmployees !== undefined) {
      admin.maxEmployees = Math.max(1, parseInt(maxEmployees));
    }
    
    if (maxOffices !== undefined) {
      admin.maxOffices = Math.max(1, parseInt(maxOffices));
    }

    await admin.save();

    res.json({
      message: "Admin details updated successfully",
      admin: {
        ...admin.toObject(),
        password: undefined
      }
    });
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

// POST /api/superadmin/admins/:id/request-paid
exports.requestPaidAccount = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.accountType !== 'demo' && admin.renewalRequested) {
      return res.status(400).json({ message: "A renewal request is already pending" });
    }

    // Mark as renewal requested and reset any previous rejection
    admin.renewalRequested = true;
    admin.renewalRequestDate = new Date();
    admin.renewalRequestedBy = req.user.id; // Track which SuperAdmin made the request
    admin.renewalMessage = `Paid account upgrade requested by ${superAdmin.name} for ${admin.name} (${admin.companyName})`;
    
    // Reset rejection fields if this is a re-request
    admin.renewalRejected = false;
    admin.renewalRejectedBy = null;
    admin.renewalRejectedDate = null;
    admin.renewalRejectionReason = null;
    
    await admin.save();
    
    res.json({ 
      message: "Paid account request sent to Master Admin successfully",
      admin: {
        ...admin.toObject(),
        password: undefined
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// PUT /api/superadmin/admins/:id/password
exports.changeAdminPassword = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.user.id);
    if (!superAdmin || !superAdmin.isAccountValid) {
      return res.status(403).json({ 
        message: "Your account has expired. Please contact master admin to renew subscription.",
        expired: true
      });
    }

    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }
    
    const admin = await Admin.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Update password and plain password
    admin.password = newPassword;
    admin.plainPassword = newPassword;
    await admin.save();
    
    res.json({ 
      message: "Password changed successfully",
      admin: {
        ...admin.toObject(),
        password: undefined
      }
    });
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