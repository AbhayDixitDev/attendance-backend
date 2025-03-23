const Admin = require("../models/admin");
const Attendance = require("../models/attendance");
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Replace with your SendGrid API key

// Helper function to calculate Euclidean distance between face descriptors
const calculateDistance = (desc1, desc2) => {
  return Math.sqrt(desc1.reduce((sum, val, i) => sum + (val - desc2[i]) ** 2, 0));
};

// Login
const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      userId: admin._id,
      userType: 'admin',
      verified: admin.verified,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Face Login
const FaceLogin = async (req, res) => {
  const { faceDescriptor } = req.body;
  try {
    const admins = await Admin.find({ faceDescriptor: { $exists: true, $ne: [] } });
    let matchedAdmin = null;
    const threshold = 0.6; // Adjust threshold as needed

    for (const admin of admins) {
      const distance = calculateDistance(faceDescriptor, admin.faceDescriptor);
      if (distance < threshold) {
        matchedAdmin = admin;
        break;
      }
    }

    if (matchedAdmin) {
      res.json({
        success: true,
        userId: matchedAdmin._id,
        userType: 'admin',
        verified: matchedAdmin.verified,
      });
    } else {
      res.status(401).json({ message: 'Face not recognized' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Forgot Password Step 1: Send OTP
const ForgotPasswordStep1 = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    await Admin.findByIdAndUpdate(admin._id, { otp, otpExpires });

    const msg = {
      to: email,
      from: 'abhaydixit.dev@gmail.com', // Replace with your verified SendGrid sender email
      subject: 'Admin Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Forgot Password Step 2: Verify OTP
const ForgotPasswordStep2 = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found with this email' });
    }
    if (!admin.otp || admin.otp !== otp || Date.now() > admin.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Forgot Password Step 3: Reset Password
const ForgotPasswordStep3 = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found with this email' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Admin.findByIdAndUpdate(admin._id, { 
      password: hashedPassword, 
      otp: null, 
      otpExpires: null 
    });

    const msg = {
      to: email,
      from: 'abhaydixit.dev@gmail.com', // Replace with your verified SendGrid sender email
      subject: 'Admin Password Reset',
      text: `Your new password is: ${newPassword}`,
      html: `<p>You have successfully reset your password. Your new password is: <strong>${newPassword}</strong></p>`,
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const ViewAllAttendance = async (req, res) => {
    const { type, class: className, section, subjectCode, date } = req.query;
    try {
      const query = {};
      if (type) query.type = type;
      if (className) query.class = className;
      if (section) query.section = section;
      if (subjectCode) query['subject.code'] = subjectCode;
      if (date) {
        const start = new Date(date).setHours(0, 0, 0, 0);
        query.date = { $gte: start, $lt: start + 24 * 60 * 60 * 1000 };
      }
  
      const attendance = await Attendance.find(query)
        .populate('userId', 'name email')
        .sort({ date: -1 });
      res.json({ success: true, attendance });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  
  module.exports = {
    Login,
    FaceLogin,
    ForgotPasswordStep1,
    ForgotPasswordStep2,
    ForgotPasswordStep3,
    ViewAllAttendance, // New
  };