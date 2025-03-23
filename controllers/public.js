const Student = require("../models/student");
const Teacher = require("../models/teacher");
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Replace with your SendGrid API key


// Step 1: Send OTP to email
const ForgotPasswordStep1 = async (req, res) => {
  const { email, userType } = req.body;
  const Model = userType === 'student' ? Student : Teacher;

  try {
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

    await Model.findByIdAndUpdate(user._id, { otp, otpExpires });

    const msg = {
      to: email,
      from: 'abhaydixit.dev@gmail.com', // Replace with your verified SendGrid sender email
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Step 2: Verify OTP
const ForgotPasswordStep2 = async (req, res) => {
  const { email, otp, userType } = req.body;
  const Model = userType === 'student' ? Student : Teacher;

  try {
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    if (!user.otp || user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Step 3: Reset Password
const ForgotPasswordStep3 = async (req, res) => {
  const { email, newPassword, userType } = req.body;
  const Model = userType === 'student' ? Student : Teacher;

  try {
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Model.findByIdAndUpdate(user._id, { 
      password: hashedPassword, 
      otp: null, 
      otpExpires: null 
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  ForgotPasswordStep1,
  ForgotPasswordStep2,
  ForgotPasswordStep3,
};