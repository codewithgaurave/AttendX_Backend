const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MasterAdmin = require("./models/MasterAdmin");

const seedMasterAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Check if master admin already exists
    const existingMaster = await MasterAdmin.findOne();
    if (existingMaster) {
      console.log("Master admin already exists:", existingMaster.email);
      process.exit(0);
    }

    // Create master admin
    const hashedPassword = await bcrypt.hash("master123", 10);
    
    const masterAdmin = new MasterAdmin({
      name: "Master Administrator",
      email: "master@attendx.com",
      password: hashedPassword,
      phone: "+91 9999999999",
      company: "AttendX Systems",
      maxSuperAdmins: 50,
      maxAdminsPerSuperAdmin: 100
    });

    await masterAdmin.save();
    
    console.log("✅ Master Admin created successfully!");
    console.log("📧 Email: master@attendx.com");
    console.log("🔑 Password: master123");
    console.log("🏢 Company: AttendX Systems");
    console.log("👥 Max Super Admins: 50");
    console.log("🎯 Max Admins per Super Admin: 100");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating master admin:", error);
    process.exit(1);
  }
};

seedMasterAdmin();