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
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

adminSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.matchPassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
