const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/login
// body: { email, password, role: "superadmin" | "admin" }
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user;
    if (role === "superadmin") {
      user = await SuperAdmin.findOne({ email });
    } else if (role === "admin") {
      user = await Admin.findOne({ email, isActive: true });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id, role),
      role,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
