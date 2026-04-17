const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getDashboard,
  submitInternship,
  getInternships,
  getAttendance,
  addSubmission,
  getSubmissions,
} = require('../controllers/studentController');

// All routes require student role
router.use(protect, authorize('student'));

router.get('/dashboard', getDashboard);
router.get('/internships', getInternships);
router.post(
  '/internships',
  upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'lor', maxCount: 1 },
  ]),
  submitInternship
);

// Attendance — read-only for student (Accepted internships only — enforced in controller)
router.get('/internships/:id/attendance', getAttendance);

// Daily Updates / Submissions (Accepted internships only — enforced in controller)
router.post(
  '/internships/:id/submissions',
  upload.array('files', 5), // up to 5 files per submission
  addSubmission
);
router.get('/internships/:id/submissions', getSubmissions);

module.exports = router;
