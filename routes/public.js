const express = require("express");
const router = express.Router();
const PublicController = require("../controllers/public");

router.post("/forget-password/step-1", PublicController.ForgotPasswordStep1);
router.post("/forget-password/step-2", PublicController.ForgotPasswordStep2);
router.post("/forget-password/step-3", PublicController.ForgotPasswordStep3);

module.exports = router;