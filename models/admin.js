const mongoose = require("mongoose")

const AdminSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  dob: Date,
  password: String,
  faceDescriptor: Array,
  verified: { type: Boolean, default: false },
  otp: String, 
  otpExpires: Number, 
});
  
module.exports = mongoose.model('admin', AdminSchema);