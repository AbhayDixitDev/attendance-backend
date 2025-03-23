const Teacher = require("../models/teacher");
const Attendance = require("../models/attendance");
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Replace with your SendGrid API key

const Signup = async (req, res) => {
  const { name, email, dob, password, subjects, classes } = req.body;

  try {
    let user = await Teacher.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = new Teacher({
      name,
      email,
      dob,
      password: hashedPassword,
      subjects,
      classes,
      verificationToken,
    });

    await user.save();

    const verificationUrl = `${process.env.BASE_URL}/api/teacher/verify-email?token=${verificationToken}`;
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
      message: 'Teacher registered successfully. Please verify your email.',
      userId: user._id.toString(), // Return userId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const calculateDistance = (desc1, desc2) => {
  return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0));
};

const RegisterFace = async (req, res) => {
  const { userId, faceDescriptor } = req.body;

  const calculateDistance = (desc1, desc2) => {
    if (desc1.length !== desc2.length) return Infinity;
    return Math.sqrt(desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0));
  };

  try {
    const teacher = await Teacher.findById(userId);
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allTeachers = await Teacher.find({ faceDescriptor: { $exists: true, $ne: [] } });
    const threshold = 0.6;
    for (const existingTeacher of allTeachers) {
      const distance = calculateDistance(faceDescriptor, existingTeacher.faceDescriptor);
      if (distance < threshold) {
        return res.status(400).json({ message: 'This face data is already registered with another user' });
      }
    }

    // Update faceDescriptor and generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await Teacher.findByIdAndUpdate(userId, { faceDescriptor, verificationToken });

    // Send verification email
    const verificationLink = `${process.env.BASE_URL}/api/teacher/verify-email?token=${verificationToken}&id=${teacher._id}`;
    const msg = {
      to: teacher.email,
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
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userData = {
      userId: teacher._id.toString(),
      userName: teacher.name,
      userType: 'teacher',
      verified: teacher.verified,
      classes: teacher.classes,
      subjects: teacher.subjects,
    };

    res.json({ success: true, ...userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const FaceLogin = async (req, res) => {
  const { faceDescriptor } = req.body;
  try {
    const teachers = await Teacher.find({ faceDescriptor: { $exists: true, $ne: [] } });
    let matchedTeacher = null;
    const threshold = 0.6;

    for (const teacher of teachers) {
      const distance = calculateDistance(faceDescriptor, teacher.faceDescriptor);
      if (distance < threshold) {
        matchedTeacher = teacher;
        break;
      }
    }

    if (matchedTeacher) {
      const userData = {
        userId: matchedTeacher._id.toString(),
        userName: matchedTeacher.name,
        userType: 'teacher',
        verified: matchedTeacher.verified,
        classes: matchedTeacher.classes,
        subjects: matchedTeacher.subjects,
      };
      res.json({ success: true, ...userData });
    } else {
      res.status(401).json({ message: 'Face not recognized!' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const ResendVerification = async (req, res) => {
  const { email, userType } = req.body;
  try {
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    if (teacher.verified) {
      return res.status(400).json({ message: 'User email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await Teacher.findByIdAndUpdate(teacher._id, { verificationToken });

    const verificationLink = `${process.env.BASE_URL}/api/teacher/verify-email?token=${verificationToken}&id=${teacher._id}`;
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
    const teacher = await Teacher.findOne({ _id: id, verificationToken: token });
    if (!teacher) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    await Teacher.findByIdAndUpdate(id, { verified: true, verificationToken: null });
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Mark Teacher Attendance
const MarkTeacherAttendance = async (req, res) => {
  const { teacherId, status } = req.body;
  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const existingAttendance = await Attendance.findOne({
      type: 'teacher',
      userId: teacherId,
      date: { $gte: today, $lt: today + 24 * 60 * 60 * 1000 },
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for today' });
    }

    const attendance = new Attendance({
      type: 'teacher',
      userId: teacherId,
      status,
    });
    await attendance.save();

    res.json({ success: true, message: 'Teacher attendance marked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// View Teacher Attendance
const ViewTeacherAttendance = async (req, res) => {
  const { teacherId } = req.params;
  try {
    const attendance = await Attendance.find({ 
      type: 'teacher', 
      userId: teacherId 
    }).sort({ date: -1 });
    res.json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// View Class Attendance
const ViewClassAttendance = async (req, res) => {
  const { teacherId, class: className, section, subjectCode, date } = req.body;
  console.log('Class attendance request:', { teacherId, className, section, subjectCode, date });

  try {
    // Verify teacher exists and has this class and subject
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const hasClass = teacher.classes.some(c => c.class === className && c.section === section);
    const hasSubject = teacher.subjects.some(s => s.code === subjectCode);
    if (!hasClass || !hasSubject) {
      return res.status(403).json({ message: 'Unauthorized or invalid class/subject' });
    }

    // Build query object
    const query = {
      type: 'student',
      class: className,
      section,
      'subject.code': subjectCode,
    };

    // Add date filter if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // Fetch attendance records
    const attendance = await Attendance.find(query).populate('userId', 'name');
    console.log('Attendance records:', attendance);

    // Transform data for frontend
    const formattedAttendance = attendance.map(record => ({
      _id: record._id,
      studentName: record.userId ? record.userId.name : 'Unknown',
      date: record.date,
      subjectName: record.subject.name || 'N/A',
      subjectCode: record.subject.code,
      status: record.status,
    }));

    res.status(200).json({ attendance: formattedAttendance });
  } catch (err) {
    console.error('Error in ViewClassAttendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  Signup,
  RegisterFace,
  Login,
  FaceLogin,
  VerifyEmail,
  ResendVerification,
  MarkTeacherAttendance, // New
  ViewTeacherAttendance, // New
  ViewClassAttendance, // Updated
};