const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema({
  adminId:  { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  name:     { type: String, required: true },
  address:  { type: String },           // auto-filled by Google reverse geocode
  placeId:  { type: String },           // Google Maps place_id
  lat:      { type: Number, required: true },
  long:     { type: Number, required: true },
  radius:   { type: Number, required: true, default: 100 }, // meters
}, { timestamps: true });

module.exports = mongoose.model("Office", officeSchema);
