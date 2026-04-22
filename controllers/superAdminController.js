const Admin = require("../models/Admin");
const QRCode = require("qrcode");

// POST /api/superadmin/admins
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, companyName } = req.body;

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const admin = await Admin.create({
      name, email, password, phone, companyName,
      createdBy: req.user.id,
    });

    // Generate QR with admin's ID (employee will scan this)
    const qrData = JSON.stringify({ adminId: admin._id, companyName });
    const qrCode = await QRCode.toDataURL(qrData);

    admin.qrCode = qrCode;
    await admin.save();

    res.status(201).json({ message: "Admin created", admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/superadmin/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const admin = await Admin.findByIdAndUpdate(req.params.id, rest, { new: true }).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/superadmin/admins/:id/toggle
exports.toggleAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.isActive = !admin.isActive;
    await admin.save();
    res.json({ message: `Admin ${admin.isActive ? "activated" : "deactivated"}`, isActive: admin.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/admins/:id/qr
exports.getAdminQR = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("qrCode name companyName");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
