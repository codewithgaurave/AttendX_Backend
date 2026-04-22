const mongoose = require("mongoose");

const punchSchema = new mongoose.Schema({
  time:         { type: Date },
  selfie:       { type: String },
  lat:          { type: Number },
  long:         { type: Number },
  address:      { type: String },   // Google reverse geocoded address
  distance:     { type: Number },   // meters from office at time of punch
  withinRadius: { type: Boolean },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  officeId:   { type: mongoose.Schema.Types.ObjectId, ref: "Office", required: true },
  date:       { type: String, required: true }, // "YYYY-MM-DD"
  checkIn:    punchSchema,
  checkOut:   punchSchema,
  status: {
    type: String,
    enum: ["present", "absent", "half-day"],
    default: "present",
  },
}, { timestamps: true });

// One record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
