const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  adminId:        { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  officeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },

  // Mandatory (6)
  name:           { type: String, required: true },
  email:          { type: String, required: true },
  phone:          { type: String, required: true },
  employeeCode:   { type: String, required: true },
  designation:    { type: String, required: true },
  joiningDate:    { type: Date, required: true },

  // Optional (7)
  department:     { type: String },
  address:        { type: String },
  emergencyContact: { type: String },
  bloodGroup:     { type: String },
  gender:         { type: String, enum: ["Male", "Female", "Other"] },
  dob:            { type: Date },
  profilePhoto:   { type: String },

  // Working hours set by admin
  workingHours: {
    startTime:  { type: String, default: "09:00" }, // "HH:MM"
    endTime:    { type: String, default: "18:00" },
  },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Ek admin ke under same employeeCode duplicate nahi hoga
employeeSchema.index({ adminId: 1, employeeCode: 1 }, { unique: true });

module.exports = mongoose.model("Employee", employeeSchema);
