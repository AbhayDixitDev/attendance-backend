const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin");

router.post("/login", AdminController.Login);
router.post("/face-login", AdminController.FaceLogin);
router.post("/forget-password/step-1", AdminController.ForgotPasswordStep1);
router.post("/forget-password/step-2", AdminController.ForgotPasswordStep2);
router.post("/forget-password/step-3", AdminController.ForgotPasswordStep3);
router.get("/attendance", AdminController.ViewAllAttendance); // New

module.exports = router;