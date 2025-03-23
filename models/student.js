const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  dob: Date,
  password: String,
  faceDescriptor: Array,
  verified: { type: Boolean, default: false },
  verificationToken: String,
  otp: String,
  otpExpires: Number,
  class: { type: String, required: true }, // e.g., "10th"
  section: { type: String, required: true }, // e.g., "A"
});

module.exports = mongoose.model('student', studentSchema);

