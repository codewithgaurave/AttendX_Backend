const router = require("express").Router();
const { login, changePassword } = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/login", login);
router.patch("/change-password", auth, changePassword);

module.exports = router;
