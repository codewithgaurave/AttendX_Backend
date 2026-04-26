const MasterAdmin = require("../models/MasterAdmin");
const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT
const generateToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });

// POST /api/master/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const masterAdmin = await MasterAdmin.findOne({ email });
    if (!masterAdmin || !masterAdmin.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const isMatch = await bcrypt.compare(password, masterAdmin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const token = generateToken(masterAdmin._id, "masteradmin");
    res.json({
      token,
      user: {
        id: masterAdmin._id,
        name: masterAdmin.name,
        email: masterAdmin.email,
        role: "masteradmin"
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/master/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const superAdmins = await SuperAdmin.find({ masterAdminId: req.user.id })
      .select('-password')
      .sort({ createdAt: -1 });
    
    const totalAdmins = await Admin.countDocuments({
      createdBy: { $in: superAdmins.map(sa => sa._id) }
    });
    
    const stats = {
      totalSuperAdmins: superAdmins.length,
      activeSuperAdmins: superAdmins.filter(sa => sa.isAccountValid).length,
      expiredSuperAdmins: superAdmins.filter(sa => sa.isExpired).length,
      totalAdmins,
      demoAccounts: superAdmins.filter(sa => sa.accountType === 'demo').length,
      paidAccounts: superAdmins.filter(sa => sa.accountType === 'paid').length
    };
    
    res.json({ stats, superAdmins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/master/superadmin
exports.createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;
    
    const masterAdmin = await MasterAdmin.findById(req.user.id);
    const currentSuperAdmins = await SuperAdmin.countDocuments({ masterAdminId: req.user.id });
    
    if (currentSuperAdmins >= masterAdmin.maxSuperAdmins) {
      return res.status(400).json({ message: `Maximum ${masterAdmin.maxSuperAdmins} super admins allowed` });
    }
    
    const existingSuperAdmin = await SuperAdmin.findOne({ email });
    if (existingSuperAdmin) {
      return res.status(400).json({ message: "Super admin already exists" });
    }
    
    // Master Admin creates SuperAdmins with high limits and long validity
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    const maxAdminsLimit = 1000; // High limit for SuperAdmins
    
    const superAdmin = new SuperAdmin({
      name,
      email,
      password,
      phone,
      company,
      masterAdminId: req.user.id,
      accountType: 'paid', // SuperAdmins are always paid accounts
      validUntil,
      maxAdmins: maxAdminsLimit
    });
    
    await superAdmin.save();
    
    res.status(201).json({
      message: "Super admin created successfully",
      superAdmin: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        accountType: superAdmin.accountType,
        validUntil: superAdmin.validUntil,
        maxAdmins: superAdmin.maxAdmins
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/master/superadmin/:id/subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { accountType, validityDays, maxAdmins, paymentAmount, paymentMethod } = req.body;
    
    const superAdmin = await SuperAdmin.findOne({ 
      _id: req.params.id, 
      masterAdminId: req.user.id 
    });
    
    if (!superAdmin) {
      return res.status(404).json({ message: "Super admin not found" });
    }
    
    const masterAdmin = await MasterAdmin.findById(req.user.id);
    
    if (accountType === 'paid') {
      superAdmin.accountType = 'paid';
      superAdmin.validUntil = new Date(Date.now() + (validityDays || 30) * 24 * 60 * 60 * 1000);
      superAdmin.maxAdmins = Math.min(maxAdmins || 10, masterAdmin.maxAdminsPerSuperAdmin);
      superAdmin.isExpired = false;
      superAdmin.lastPaymentDate = new Date();
      superAdmin.paymentAmount = paymentAmount;
      superAdmin.paymentMethod = paymentMethod;
    }
    
    await superAdmin.save();
    
    // Reactivate all admins under this super admin
    await Admin.updateMany(
      { createdBy: superAdmin._id },
      { 
        canScanAttendance: true,
        isActive: true,
        lastValidityCheck: new Date()
      }
    );
    
    res.json({
      message: "Subscription updated successfully",
      superAdmin: {
        id: superAdmin._id,
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

// DELETE /api/master/superadmin/:id
exports.deleteSuperAdmin = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findOne({ 
      _id: req.params.id, 
      masterAdminId: req.user.id 
    });
    
    if (!superAdmin) {
      return res.status(404).json({ message: "Super admin not found" });
    }
    
    // Deactivate all admins under this super admin
    await Admin.updateMany(
      { createdBy: superAdmin._id },
      { isActive: false, canScanAttendance: false }
    );
    
    superAdmin.isActive = false;
    await superAdmin.save();
    
    res.json({ message: "Super admin deactivated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/master/superadmin/:id/admins
exports.getSuperAdminDetails = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findOne({ 
      _id: req.params.id, 
      masterAdminId: req.user.id 
    }).select('-password');
    
    if (!superAdmin) {
      return res.status(404).json({ message: "Super admin not found" });
    }
    
    const admins = await Admin.find({ createdBy: superAdmin._id })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ superAdmin, admins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};