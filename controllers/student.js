const Student = require("../models/student");
const Attendance = require("../models/attendance");
const Teacher = require("../models/teacher");
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Replace with your SendGrid API key

const Signup = async (req, res) => {
  const { name, email, dob, password, class: studentClass, section } = req.body;

  try {
    let user = await Student.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = new Student({
      name,
      email,
      dob,
      password: hashedPassword,
      class: studentClass,
      section,
      verificationToken,
    });

    await user.save();

    const verificationUrl = `${process.env.BASE_URL}/api/student/verify-email?token=${verificationToken}`;
    const msg = {
      to: email,
      from: 'abhaydixit.dev@gmail.com',
      subject: 'Verify Your Email',
      text: `Please verify your email by clicking the following link: ${verificationUrl}`,
      html: `<p>Please verify your email by clicking the following link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    };
    await sgMail.send(msg);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully. Please verify your email.',
      userId: user._id.toString(), // Return userId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const RegisterFace = async (req, res) => {
  const { userId, faceDescriptor } = req.body;

  const calculateDistance = (desc1, desc2) => {
    if (desc1.length !== desc2.length) return Infinity;
    return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0));
  };

  try {
    const student = await Student.findById(userId);
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allStudents = await Student.find({ faceDescriptor: { $exists: true, $ne: [] } });
    const threshold = 0.6;
    for (const existingStudent of allStudents) {
      const distance = calculateDistance(faceDescriptor, existingStudent.faceDescriptor);
      if (distance < threshold) {
        return res.status(400).json({ message: 'This face data is already registered with another user' });
      }
    }

    // Update faceDescriptor and generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await Student.findByIdAndUpdate(userId, { faceDescriptor, verificationToken });

    // Send verification email
    const verificationLink = `${process.env.BASE_URL}/api/student/verify-email?token=${verificationToken}&id=${student._id}`;
    const msg = {
      to: student.email,
      from: 'abhaydixit.dev@gmail.com', // Replace with your verified SendGrid sender email
      subject: 'Verify Your Email',
      text: `Please click the following link to verify your email: ${verificationLink}`,
      html: `<p>Please click the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'Face registered successfully! Please verify your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving face data', error: err.message });
  }
};

const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ 
      success: true, 
      userId: student._id, 
      userName: student.name, 
      userType: 'student', 
      verified: student.verified // Include verified status
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const FaceLogin = async (req, res) => {
  const { faceDescriptor } = req.body;
  try {
    const students = await Student.find({ faceDescriptor: { $exists: true, $ne: [] } });
    let matchedStudent = null;
    const threshold = 0.6;

    for (const student of students) {
      const distance = calculateDistance(faceDescriptor, student.faceDescriptor);
      if (distance < threshold) {
        matchedStudent = student;
        break;
      }
    }

    if (matchedStudent) {
      res.json({ 
        success: true, 
        userId: matchedStudent._id, 
        userName: matchedStudent.name, 
        userType: 'student', 
        verified: matchedStudent.verified // Include verified status
      });
    } else {
      res.status(401).json({ message: 'Face not recognized or user not verified' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const ResendVerification = async (req, res) => {
  const { email, userType } = req.body;
  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    if (student.verified) {
      return res.status(400).json({ message: 'User email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await Student.findByIdAndUpdate(student._id, { verificationToken });

    const verificationLink = `${process.env.BASE_URL}/api/student/verify-email?token=${verificationToken}&id=${student._id}`;
    const msg = {
      to: email,
      from: 'abhaydixit.dev@gmail.com', // Replace with your verified SendGrid sender email
      subject: 'Verify Your Email',
      text: `Please click the following link to verify your email: ${verificationLink}`,
      html: `<p>Please click the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
    };
    await sgMail.send(msg);

    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const VerifyEmail = async (req, res) => {
  const { token, id } = req.query;
  try {
    const student = await Student.findOne({ _id: id, verificationToken: token });
    if (!student) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    await Student.findByIdAndUpdate(id, { verified: true, verificationToken: null });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const calculateDistance = (desc1, desc2) => {
  return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0));
};

// Mark Student Attendance
const MarkAttendance = async (req, res) => {
  const { studentId, subjectCode, status } = req.body;
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const teacher = await Teacher.findOne({
      "subjects.code": subjectCode,
      "classes.class": student.class,
      "classes.section": student.section,
    });
    if (!teacher) {
      return res.status(400).json({ message: 'No teacher assigned for this subject and class' });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const teacherAttendance = await Attendance.findOne({
      type: 'teacher',
      userId: teacher._id,
      date: { $gte: today, $lt: today + 24 * 60 * 60 * 1000 },
      status: 'Present',
    });
    if (!teacherAttendance) {
      return res.status(400).json({ message: 'Teacher has not marked attendance today' });
    }

    const existingAttendance = await Attendance.findOne({
      type: 'student',
      userId: studentId,
      'subject.code': subjectCode,
      date: { $gte: today, $lt: today + 24 * 60 * 60 * 1000 },
    });
    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this subject today' });
    }

    const subject = teacher.subjects.find(sub => sub.code === subjectCode);
    const attendance = new Attendance({
      type: 'student',
      userId: studentId,
      teacherId: teacher._id,
      subject,
      class: student.class,
      section: student.section,
      status,
    });
    await attendance.save();

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// View Student Attendance
const ViewAttendance = async (req, res) => {
  const { studentId } = req.params;
  try {
    const attendance = await Attendance.find({ 
      type: 'student', 
      userId: studentId 
    }).sort({ date: -1 });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const GetSubjects = async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const teachers = await Teacher.find({
      "classes.class": student.class,
      "classes.section": student.section,
    });
    const subjects = teachers.flatMap(teacher => teacher.subjects);
    res.json({ success: true, subjects });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Add to exports
module.exports = {
  Signup,
  RegisterFace,
  Login,
  FaceLogin,
  VerifyEmail,
  ResendVerification,
  MarkAttendance,
  ViewAttendance,
  GetSubjects, // New
};