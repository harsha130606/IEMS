const Internship = require('../models/Internship');
const Attendance = require('../models/Attendance');
const Submission = require('../models/Submission');

// @desc    Get student dashboard stats
// @route   GET /api/student/dashboard
// @access  Student
const getDashboard = async (req, res) => {
  try {
    const internships = await Internship.find({ studentId: req.user._id });
    const totalCompleted = internships.filter((i) => i.status === 'Accepted').length;
    const totalPending = internships.filter((i) => i.status === 'Pending').length;
    const totalRejected = internships.filter((i) => i.status === 'Rejected').length;

    let totalDurationDays = 0;
    internships.forEach((i) => {
      if (i.startDate && i.endDate) {
        totalDurationDays += Math.ceil(
          (new Date(i.endDate) - new Date(i.startDate)) / (1000 * 60 * 60 * 24)
        );
      }
    });

    res.json({
      totalInternships: internships.length,
      totalCompleted,
      totalPending,
      totalRejected,
      totalDurationDays,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit new internship
// @route   POST /api/student/internships
// @access  Student
const submitInternship = async (req, res) => {
  try {
    const { companyName, paid, startDate, endDate } = req.body;

    if (!companyName || !startDate || !endDate) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const internshipData = {
      studentId: req.user._id,
      companyName,
      paid: paid === 'true' || paid === true,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.certificate && req.files.certificate[0]) {
        internshipData.certificate = `/uploads/${req.files.certificate[0].filename}`;
      }
      if (req.files.lor && req.files.lor[0]) {
        internshipData.lor = `/uploads/${req.files.lor[0].filename}`;
      }
    }

    const internship = await Internship.create(internshipData);
    res.status(201).json(internship);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student's internships
// @route   GET /api/student/internships
// @access  Student
const getInternships = async (req, res) => {
  try {
    const internships = await Internship.find({ studentId: req.user._id })
      .populate('facultyId', 'name email')
      .sort('-createdAt');
    res.json(internships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance for student's own internship (read-only)
// @route   GET /api/student/internships/:id/attendance
// @access  Student
// @guard   Internship must be Accepted
const getAttendance = async (req, res) => {
  try {
    const internship = await Internship.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }

    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Attendance is only available for Accepted internships' });
    }

    const records = await Attendance.find({ internshipId: req.params.id }).sort('date');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a daily update (with optional file attachments)
// @route   POST /api/student/internships/:id/submissions
// @access  Student
// @guard   Internship must be Accepted
const addSubmission = async (req, res) => {
  try {
    const { title, workDone, description } = req.body;

    if (!title || !workDone) {
      return res.status(400).json({ message: 'Title and Work Done are required' });
    }

    const internship = await Internship.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }

    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Daily updates can only be submitted for Accepted internships' });
    }

    // Map uploaded files to schema format
    const files = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      path: `/uploads/${f.filename}`,
    }));

    const submission = await Submission.create({
      internshipId: req.params.id,
      studentId: req.user._id,
      title,
      workDone,
      description: description || '',
      files,
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student's own submissions for an internship
// @route   GET /api/student/internships/:id/submissions
// @access  Student
// @guard   Internship must be Accepted
const getSubmissions = async (req, res) => {
  try {
    const internship = await Internship.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }

    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Submissions are only available for Accepted internships' });
    }

    const submissions = await Submission.find({ internshipId: req.params.id }).sort('-createdAt');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
  submitInternship,
  getInternships,
  getAttendance,
  addSubmission,
  getSubmissions,
};
