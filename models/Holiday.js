const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  name:    { type: String, required: true },
  date:    { type: String, required: true }, // "YYYY-MM-DD"
  type:    { type: String, enum: ["public", "optional"], default: "public" },
}, { timestamps: true });

holidaySchema.index({ adminId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);
