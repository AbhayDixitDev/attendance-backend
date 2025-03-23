const express = require("express");
const router = express.Router();
const TeacherController = require("../controllers/teacher");

router.post("/signup", TeacherController.Signup);
router.post("/register-face", TeacherController.RegisterFace);
router.post("/login", TeacherController.Login);
router.post("/face-login", TeacherController.FaceLogin);
router.get("/verify-email", TeacherController.VerifyEmail);
router.post("/resend-verification", TeacherController.ResendVerification);
router.post("/attendance/mark", TeacherController.MarkTeacherAttendance); // New
router.get("/attendance/:teacherId", TeacherController.ViewTeacherAttendance); // New
router.post("/attendance/class", TeacherController.ViewClassAttendance); // New


module.exports = router;