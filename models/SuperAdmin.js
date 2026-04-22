const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

superAdminSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 10);
});

superAdminSchema.methods.matchPassword = function (pass) {
  return bcrypt.compare(pass, this.password);
};

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
