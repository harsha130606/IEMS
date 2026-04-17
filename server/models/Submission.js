const mongoose = require('mongoose');

// Embedded sub-schema for uploaded files
const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    path: { type: String, required: true }, // e.g. /uploads/file-123.pdf
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    internshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Internship',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    workDone: {
      type: String,
      required: [true, 'Work Done is required'],
    },
    description: {
      type: String,
      default: '',
    },
    files: [fileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
