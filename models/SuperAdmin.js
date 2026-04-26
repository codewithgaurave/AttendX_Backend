const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  company: { type: String },
  
  // Master Admin reference
  masterAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterAdmin", required: true },
  
  // Subscription details
  accountType: { type: String, enum: ["demo", "paid"], default: "paid" },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }, // 1 year default
  maxAdmins: { type: Number, default: 1000 }, // High limit for creating admins
  canCreateAdmins: { type: Boolean, default: true },
  
  isActive: { type: Boolean, default: true },
  isExpired: { type: Boolean, default: false },
  
  // Payment tracking
  lastPaymentDate: { type: Date },
  paymentAmount: { type: Number },
  paymentMethod: { type: String },
  
}, { timestamps: true });

// Check if account is expired
superAdminSchema.virtual('isAccountValid').get(function() {
  return this.isActive && !this.isExpired && new Date() <= this.validUntil;
});

// Auto-expire check
superAdminSchema.pre('save', function() {
  if (new Date() > this.validUntil) {
    this.isExpired = true;
  }
});

superAdminSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
});

superAdminSchema.methods.matchPassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
