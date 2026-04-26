const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  phone:        { type: String, required: true },
  companyName:  { type: String, required: true },
  qrCode:       { type: String },           // base64 QR image
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin" },
  
  // Subscription system for Admins
  accountType: { type: String, enum: ["demo", "paid"], default: "demo" },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  maxEmployees: { type: Number, default: 5 },
  maxOffices: { type: Number, default: 1 },
  
  isActive:     { type: Boolean, default: true },
  isExpired: { type: Boolean, default: false },
  
  // Renewal request system
  renewalRequested: { type: Boolean, default: false },
  renewalRequestDate: { type: Date },
  renewalMessage: { type: String }, // Admin's message for renewal
  renewalApproved: { type: Boolean, default: false },
  renewalApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "MasterAdmin" },
  renewalApprovedDate: { type: Date },
  
  // Payment tracking (for future use when Master Admin approves)
  lastPaymentDate: { type: Date },
  paymentAmount: { type: Number },
  paymentMethod: { type: String },
  
  // Subscription validation
  canScanAttendance: { type: Boolean, default: true },
  lastValidityCheck: { type: Date, default: Date.now },
  
}, { timestamps: true });

// Request renewal (when demo expires)
adminSchema.methods.requestRenewal = async function(message) {
  this.renewalRequested = true;
  this.renewalRequestDate = new Date();
  this.renewalMessage = message || 'Please renew my account';
  this.renewalApproved = false;
  await this.save();
  return true;
};

// Approve renewal (Master Admin only)
adminSchema.methods.approveRenewal = async function(masterAdminId, newValidityDays = 30) {
  this.renewalApproved = true;
  this.renewalApprovedBy = masterAdminId;
  this.renewalApprovedDate = new Date();
  this.validUntil = new Date(Date.now() + newValidityDays * 24 * 60 * 60 * 1000);
  this.isExpired = false;
  this.canScanAttendance = true;
  this.renewalRequested = false; // Reset request
  await this.save();
  return true;
};

// Check if admin account is valid
adminSchema.virtual('isAccountValid').get(function() {
  return this.isActive && !this.isExpired && new Date() <= this.validUntil;
});

// Virtual field for company (use companyName if company is not set)
adminSchema.virtual('company').get(function() {
  return this.companyName;
});

// Ensure virtuals are included in JSON
adminSchema.set('toJSON', { virtuals: true });
adminSchema.set('toObject', { virtuals: true });

// Auto-expire check
adminSchema.pre('save', function() {
  if (new Date() > this.validUntil) {
    this.isExpired = true;
    this.canScanAttendance = false;
  }
});

// Check if admin can access system based on both SuperAdmin and own validity
adminSchema.methods.checkValidity = async function() {
  const SuperAdmin = mongoose.model('SuperAdmin');
  const superAdmin = await SuperAdmin.findById(this.createdBy);
  
  // First check SuperAdmin validity
  if (!superAdmin || !superAdmin.isAccountValid) {
    this.canScanAttendance = false;
    this.isActive = false;
    await this.save();
    return false;
  }
  
  // Then check own validity
  if (!this.isAccountValid) {
    this.canScanAttendance = false;
    await this.save();
    return false;
  }
  
  this.canScanAttendance = true;
  this.lastValidityCheck = new Date();
  await this.save();
  return true;
};

adminSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.matchPassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
