const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const masterAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },                    // Optional now
  phone: { type: String, required: true, unique: true }, // Mandatory + unique
  password: { type: String, required: true },
  company: { type: String },
  isActive: { type: Boolean, default: true },
  
  // Subscription limits
  maxSuperAdmins: { type: Number, default: 5 },
  maxAdminsPerSuperAdmin: { type: Number, default: 10 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Method to check password
masterAdminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("MasterAdmin", masterAdminSchema);