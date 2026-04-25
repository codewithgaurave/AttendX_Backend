const jwt = require("jsonwebtoken");
const MasterAdmin = require("../models/MasterAdmin");
const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/login
// body: { email, password, role: "masteradmin" | "superadmin" | "admin" }
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user;
    if (role === "masteradmin") {
      user = await MasterAdmin.findOne({ email, isActive: true });
    } else if (role === "superadmin") {
      user = await SuperAdmin.findOne({ email });
      
      // Check if SuperAdmin account is valid
      if (user && !user.isAccountValid) {
        return res.status(403).json({ 
          message: "Your account has expired. Please contact master admin to renew subscription.",
          expired: true,
          accountType: user.accountType,
          validUntil: user.validUntil
        });
      }
    } else if (role === "admin") {
      user = await Admin.findOne({ email, isActive: true });
      
      // Check admin validity
      if (user) {
        const isValid = await user.checkValidity();
        if (!isValid) {
          return res.status(403).json({ 
            message: "Your access has been suspended due to expired subscription. Please contact your administrator.",
            expired: true
          });
        }
      }
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // For SuperAdmin, include subscription info
    let responseData = {
      token: generateToken(user._id, role),
      role,
      user: { id: user._id, name: user.name, email: user.email },
    };

    if (role === "superadmin") {
      responseData.subscription = {
        accountType: user.accountType,
        validUntil: user.validUntil,
        maxAdmins: user.maxAdmins,
        isExpired: user.isExpired
      };
    }

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
