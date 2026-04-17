const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboard,
  getInternships,
  updateStatus,
  evaluateInternship,
  getAttendance,
  markAttendance,
  getSubmissions,
} = require('../controllers/facultyController');

// All routes require faculty role
router.use(protect, authorize('faculty'));

router.get('/dashboard', getDashboard);
router.get('/internships', getInternships);
router.put('/internships/:id/status', updateStatus);
router.put('/internships/:id/evaluate', evaluateInternship);

// Attendance (Accepted internships only — enforced in controller)
router.get('/internships/:id/attendance', getAttendance);
router.post('/internships/:id/attendance', markAttendance);

// Submissions / Daily Updates (Accepted internships only — enforced in controller)
router.get('/internships/:id/submissions', getSubmissions);

module.exports = router;
