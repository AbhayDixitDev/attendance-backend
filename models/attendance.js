const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  type: { type: String, enum: ['student', 'teacher'], required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type' // Dynamically references 'student' or 'teacher'
  },
  subject: { 
    name: String, 
    code: String 
  }, // Only for student attendance
  class: String, // Only for student attendance, e.g., "12th"
  section: String, // Only for student attendance, e.g., "A"
  date: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
});

module.exports = mongoose.model('Attendance', attendanceSchema);