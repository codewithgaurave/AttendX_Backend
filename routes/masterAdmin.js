const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  login,
  getDashboard,
  createSuperAdmin,
  updateSubscription,
  deleteSuperAdmin,
  getSuperAdminDetails
} = require("../controllers/masterAdminController");

// Public routes
router.post("/login", login);

// Protected routes (Master Admin only)
router.get("/dashboard", auth, role("masteradmin"), getDashboard);
router.post("/superadmin", auth, role("masteradmin"), createSuperAdmin);
router.put("/superadmin/:id/subscription", auth, role("masteradmin"), updateSubscription);
router.delete("/superadmin/:id", auth, role("masteradmin"), deleteSuperAdmin);
router.get("/superadmin/:id", auth, role("masteradmin"), getSuperAdminDetails);

module.exports = router;