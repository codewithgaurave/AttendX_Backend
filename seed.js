require("dotenv").config();
const mongoose = require("mongoose");
const SuperAdmin = require("./models/SuperAdmin");

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await SuperAdmin.findOne({ email: "superadmin@attendancex.com" });
  if (exists) {
    console.log("SuperAdmin already exists");
    process.exit(0);
  }

  await SuperAdmin.create({
    name: "Super Admin",
    email: "superadmin@attendancex.com",
    password: "Admin@123",
  });

  console.log("SuperAdmin created!");
  console.log("Email: superadmin@attendancex.com");
  console.log("Password: Admin@123");
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
