const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  createAdmin,
  getAllAdmins,
  updateAdmin,
  toggleAdmin,
  getAdminQR,
} = require("../controllers/superAdminController");

router.use(auth, role("superadmin"));

router.post("/admins", createAdmin);
router.get("/admins", getAllAdmins);
router.put("/admins/:id", updateAdmin);
router.patch("/admins/:id/toggle", toggleAdmin);
router.get("/admins/:id/qr", getAdminQR);

module.exports = router;
