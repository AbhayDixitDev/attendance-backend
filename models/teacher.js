const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  dob: Date,
  password: String,
  faceDescriptor: Array,
  verified: { type: Boolean, default: false },
  verificationToken: String,
  otp: String,
  otpExpires: Number,
  subjects: [{
    name: String, // e.g., "Mathematics"
    code: String, // e.g., "MATH101"
  }],
  classes: [{
    class: String, // e.g., "10th"
    section: String, // e.g., "A"
  }],
});

module.exports = mongoose.model('teacher', teacherSchema);