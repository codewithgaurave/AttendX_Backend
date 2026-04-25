const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  createAdmin,
  getAllAdmins,
  updateAdmin,
  toggleAdmin,
  getAdminQR,
  getSubscription,
  updateAdminSubscription,
  getAdminDetails,
} = require("../controllers/superAdminController");

router.use(auth, role("superadmin"));

router.get("/subscription", getSubscription);
router.post("/admins", createAdmin);
router.get("/admins", getAllAdmins);
router.get("/admins/:id/details", getAdminDetails);
router.put("/admins/:id", updateAdmin);
router.put("/admins/:id/subscription", updateAdminSubscription);
router.patch("/admins/:id/toggle", toggleAdmin);
router.get("/admins/:id/qr", getAdminQR);

module.exports = router;
