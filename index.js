const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'https://attend-x-frontend.vercel.app'], credentials: true }));
app.use(express.json({ limit: "10mb" })); // 10mb for base64 selfie/QR
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/master", require("./routes/masterAdmin"));
app.use("/api/superadmin", require("./routes/superAdmin"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/attendance", require("./routes/attendance"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
