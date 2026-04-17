const Internship = require('../models/Internship');
const Attendance = require('../models/Attendance');
const Submission = require('../models/Submission');

// @desc    Get faculty dashboard stats
// @route   GET /api/faculty/dashboard
// @access  Faculty
const getDashboard = async (req, res) => {
  try {
    const totalAssigned = await Internship.countDocuments({ facultyId: req.user._id });
    const totalEvaluated = await Internship.countDocuments({
      facultyId: req.user._id,
      'evaluation.rating': { $ne: null },
    });
    const pendingReview = await Internship.countDocuments({
      facultyId: req.user._id,
      status: 'Pending',
    });
    const accepted = await Internship.countDocuments({
      facultyId: req.user._id,
      status: 'Accepted',
    });
    const rejected = await Internship.countDocuments({
      facultyId: req.user._id,
      status: 'Rejected',
    });

    res.json({
      totalAssigned,
      totalEvaluated,
      pendingReview,
      accepted,
      rejected,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get internships assigned to faculty
// @route   GET /api/faculty/internships
// @access  Faculty
const getInternships = async (req, res) => {
  try {
    const internships = await Internship.find({ facultyId: req.user._id })
      .populate('studentId', 'name email')
      .sort('-createdAt');
    res.json(internships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update internship status (accept/reject)
// @route   PUT /api/faculty/internships/:id/status
// @access  Faculty
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Accepted or Rejected' });
    }

    const internship = await Internship.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found or not assigned to you' });
    }

    internship.status = status;
    await internship.save();

    const updated = await Internship.findById(internship._id)
      .populate('studentId', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Evaluate internship (marks + feedback)
// @route   PUT /api/faculty/internships/:id/evaluate
// @access  Faculty
// @guard   Internship must be Accepted
const evaluateInternship = async (req, res) => {
  try {
    const { rating, remarks } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const internship = await Internship.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found or not assigned to you' });
    }

    // Guard: evaluation only allowed on accepted internships
    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Can only evaluate an Accepted internship' });
    }

    internship.evaluation = {
      rating: Number(rating),
      remarks: remarks || '',
    };
    await internship.save();

    const updated = await Internship.findById(internship._id)
      .populate('studentId', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance records for an internship
// @route   GET /api/faculty/internships/:id/attendance
// @access  Faculty
// @guard   Internship must be Accepted
const getAttendance = async (req, res) => {
  try {
    const internship = await Internship.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found or not assigned to you' });
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

// @desc    Mark or update attendance for a date (upsert)
// @route   POST /api/faculty/internships/:id/attendance
// @access  Faculty
// @guard   Internship must be Accepted
const markAttendance = async (req, res) => {
  try {
    const { date, status } = req.body;

    if (!date || !['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ message: 'A valid date and status (Present/Absent) are required' });
    }

    const internship = await Internship.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found or not assigned to you' });
    }

    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Cannot mark attendance for a non-Accepted internship' });
    }

    // Upsert — update existing record for this date or create a new one
    const record = await Attendance.findOneAndUpdate(
      { internshipId: req.params.id, date: new Date(date) },
      {
        internshipId: req.params.id,
        markedBy: req.user._id,
        date: new Date(date),
        status,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student daily update submissions for an internship (faculty view)
// @route   GET /api/faculty/internships/:id/submissions
// @access  Faculty
// @guard   Internship must be Accepted
const getSubmissions = async (req, res) => {
  try {
    const internship = await Internship.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!internship) {
      return res.status(404).json({ message: 'Internship not found or not assigned to you' });
    }

    if (internship.status !== 'Accepted') {
      return res.status(403).json({ message: 'Submissions are only available for Accepted internships' });
    }

    const submissions = await Submission.find({ internshipId: req.params.id })
      .populate('studentId', 'name email')
      .sort('-createdAt');

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
  getInternships,
  updateStatus,
  evaluateInternship,
  getAttendance,
  markAttendance,
  getSubmissions,
};
