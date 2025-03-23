const express = require("express");
const router = express.Router();
const StudentController = require("../controllers/student");

router.post("/signup", StudentController.Signup);
router.post("/register-face", StudentController.RegisterFace);
router.post("/login", StudentController.Login);
router.post("/face-login", StudentController.FaceLogin);
router.get("/verify-email", StudentController.VerifyEmail);
router.post("/resend-verification", StudentController.ResendVerification);
router.post("/attendance/mark", StudentController.MarkAttendance); // New
router.get("/attendance/:studentId", StudentController.ViewAttendance); // New
router.get("/subjects/:studentId", StudentController.GetSubjects); // New

module.exports = router;