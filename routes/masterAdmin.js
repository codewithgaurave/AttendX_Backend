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
const { getPendingRenewals, approveRenewal, rejectRenewal } = require("../controllers/renewalController");

// Public routes
router.post("/login", login);

// Protected routes (Master Admin only)
router.get("/dashboard", auth, role("masteradmin"), getDashboard);
router.post("/superadmin", auth, role("masteradmin"), createSuperAdmin);
router.put("/superadmin/:id/subscription", auth, role("masteradmin"), updateSubscription);
router.delete("/superadmin/:id", auth, role("masteradmin"), deleteSuperAdmin);
router.get("/superadmin/:id/admins", auth, role("masteradmin"), getSuperAdminDetails);

// Renewal management
router.get("/renewal-requests", auth, role("masteradmin"), getPendingRenewals);
router.post("/approve-renewal/:adminId", auth, role("masteradmin"), approveRenewal);
router.post("/reject-renewal/:adminId", auth, role("masteradmin"), rejectRenewal);

module.exports = router;