import { useState, useEffect } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import {
  HiEye,
  HiCheckCircle,
  HiXCircle,
  HiStar,
  HiDownload,
} from 'react-icons/hi';

const BASE_URL = 'http://localhost:5000';

const InternshipReview = () => {
  // ── Existing state ───────────────────────────────────────────
  const [internships, setInternships]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detailModal, setDetailModal]   = useState(null);
  const [evalModal, setEvalModal]       = useState(null);
  const [evalForm, setEvalForm]         = useState({ rating: 5, remarks: '' });
  const [submitting, setSubmitting]     = useState(false);

  // ── New state ────────────────────────────────────────────────
  const [activeDetailTab, setActiveDetailTab]   = useState('details');
  const [attendanceData, setAttendanceData]     = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceForm, setAttendanceForm]     = useState({ date: '', status: 'Present' });
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [submissionsData, setSubmissionsData]   = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    fetchInternships();
  }, []);

  // Reset tab + load data each time a new modal is opened
  useEffect(() => {
    if (detailModal) {
      setActiveDetailTab('details');
      setAttendanceData([]);
      setSubmissionsData([]);
    }
  }, [detailModal?._id]);

  // ── Data fetchers ────────────────────────────────────────────
  const fetchInternships = async () => {
    try {
      const { data } = await api.get('/api/faculty/internships');
      setInternships(data);
    } catch {
      toast.error('Failed to load internships');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (id) => {
    setAttendanceLoading(true);
    try {
      const { data } = await api.get(`/api/faculty/internships/${id}/attendance`);
      setAttendanceData(data);
    } catch {
      // 403 if not accepted — silently ignore, guard is in controller
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchSubmissions = async (id) => {
    setSubmissionsLoading(true);
    try {
      const { data } = await api.get(`/api/faculty/internships/${id}/submissions`);
      setSubmissionsData(data);
    } catch {
      // 403 if not accepted — silently ignore
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    try {
      const { data } = await api.put(`/api/faculty/internships/${id}/status`, { status });
      toast.success(`Internship ${status.toLowerCase()}`);
      // Update in-place — no full refetch needed
      setInternships((prev) => prev.map((i) => (i._id === id ? data : i)));
      if (detailModal?._id === id) setDetailModal(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!evalForm.rating) { toast.error('Please provide a rating'); return; }
    setSubmitting(true);
    try {
      await api.put(`/api/faculty/internships/${evalModal._id}/evaluate`, evalForm);
      toast.success('Evaluation submitted');
      setEvalModal(null);
      setEvalForm({ rating: 5, remarks: '' });
      fetchInternships();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to evaluate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!attendanceForm.date) { toast.error('Please select a date'); return; }
    setMarkingAttendance(true);
    try {
      await api.post(
        `/api/faculty/internships/${detailModal._id}/attendance`,
        attendanceForm
      );
      toast.success('Attendance marked');
      fetchAttendance(detailModal._id);
      setAttendanceForm({ date: '', status: 'Present' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveDetailTab(tab);
    if (tab === 'attendance') fetchAttendance(detailModal._id);
    if (tab === 'submissions') fetchSubmissions(detailModal._id);
  };

  // ── Table columns ─────────────────────────────────────────────
  const columns = [
    {
      key: 'student',
      header: 'Student',
      accessor: (row) => row.studentId?.name || 'N/A',
    },
    { key: 'companyName', header: 'Company', accessor: 'companyName' },
    {
      key: 'paid',
      header: 'Type',
      render: (row) => <StatusBadge status={row.paid ? 'Paid' : 'Unpaid'} />,
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (row) => {
        const days = Math.ceil(
          (new Date(row.endDate) - new Date(row.startDate)) / (1000 * 60 * 60 * 24)
        );
        return `${days} days`;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'evaluation',
      header: 'Rating',
      render: (row) =>
        row.evaluation?.rating ? (
          <span className="text-amber-400 font-medium">
            {'★'.repeat(row.evaluation.rating)}
            <span className="text-surface-600">{'★'.repeat(5 - row.evaluation.rating)}</span>
          </span>
        ) : (
          <span className="text-surface-700 text-sm">Not rated</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* View Details */}
          <button
            onClick={() => setDetailModal(row)}
            className="p-2 rounded-lg hover:bg-primary-500/10 text-surface-700 hover:text-primary-400 transition"
            title="View Details"
          >
            <HiEye className="w-4 h-4" />
          </button>

          {/* Accept / Reject — only for Pending internships */}
          {row.status === 'Pending' && (
            <>
              <button
                onClick={() => handleStatusUpdate(row._id, 'Accepted')}
                className="p-2 rounded-lg hover:bg-emerald-500/10 text-surface-700 hover:text-emerald-500 transition"
                title="Accept Internship"
              >
                <HiCheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStatusUpdate(row._id, 'Rejected')}
                className="p-2 rounded-lg hover:bg-red-500/10 text-surface-700 hover:text-red-500 transition"
                title="Reject Internship"
              >
                <HiXCircle className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Evaluate — only for Accepted internships */}
          {row.status === 'Accepted' && (
            <button
              onClick={() => {
                setEvalModal(row);
                setEvalForm({
                  rating: row.evaluation?.rating || 5,
                  remarks: row.evaluation?.remarks || '',
                });
              }}
              className="p-2 rounded-lg hover:bg-amber-500/10 text-surface-700 hover:text-amber-500 transition"
              title="Evaluate Internship"
            >
              <HiStar className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Tabs shown inside detail modal
  const detailTabs = [
    { key: 'details', label: 'Details' },
    ...(detailModal?.status === 'Accepted'
      ? [
          { key: 'attendance', label: 'Attendance' },
          { key: 'submissions', label: 'Daily Updates' },
        ]
      : []),
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Review Internships</h1>
        <p className="page-subtitle">{internships.length} internships assigned to you</p>
      </div>

      {loading ? (
        <div className="glass-card animate-pulse h-64" />
      ) : (
        <DataTable columns={columns} data={internships} />
      )}

      {/* ══ Detail Modal ══════════════════════════════════════════ */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Internship Details"
        size="lg"
      >
        {detailModal && (
          <div className="space-y-4">

            {/* Tab Bar */}
            <div className="flex gap-0 border-b border-surface-200 -mx-6 px-6">
              {detailTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabSwitch(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeDetailTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-surface-600 hover:text-surface-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Details Tab ───────────────────────────────────── */}
            {activeDetailTab === 'details' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Student</p>
                    <p className="text-surface-900 font-medium">{detailModal.studentId?.name}</p>
                    <p className="text-xs text-surface-700">{detailModal.studentId?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Company</p>
                    <p className="text-surface-900 font-medium">{detailModal.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Status</p>
                    <StatusBadge status={detailModal.status} />
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Duration</p>
                    <p className="text-surface-900">{detailModal.durationDays} days</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="flex gap-4 flex-wrap">
                  {detailModal.certificate && (
                    <a
                      href={`${BASE_URL}${detailModal.certificate}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary-500 hover:text-primary-600"
                    >
                      📄 View Certificate
                    </a>
                  )}
                  {detailModal.lor && (
                    <a
                      href={`${BASE_URL}${detailModal.lor}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary-500 hover:text-primary-600"
                    >
                      📄 View LOR
                    </a>
                  )}
                </div>

                {/* Accept / Reject actions — only if Pending */}
                {detailModal.status === 'Pending' && (
                  <div className="flex gap-3 pt-3 border-t border-surface-200">
                    <button
                      onClick={() => handleStatusUpdate(detailModal._id, 'Accepted')}
                      className="btn-primary flex-1 gap-2"
                    >
                      <HiCheckCircle className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(detailModal._id, 'Rejected')}
                      className="btn-secondary flex-1 gap-2 hover:text-red-500 hover:border-red-300"
                    >
                      <HiXCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Attendance Tab ────────────────────────────────── */}
            {activeDetailTab === 'attendance' && (
              <div className="space-y-4 pt-1">
                {/* Mark attendance form */}
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3">
                  <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Mark / Update Attendance
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={attendanceForm.date}
                      onChange={(e) =>
                        setAttendanceForm((p) => ({ ...p, date: e.target.value }))
                      }
                      className="input-field flex-1 min-w-[140px]"
                    />
                    <select
                      value={attendanceForm.status}
                      onChange={(e) =>
                        setAttendanceForm((p) => ({ ...p, status: e.target.value }))
                      }
                      className="input-field flex-1 min-w-[120px]"
                    >
                      <option>Present</option>
                      <option>Absent</option>
                    </select>
                    <button
                      onClick={handleMarkAttendance}
                      disabled={markingAttendance}
                      className="btn-primary"
                    >
                      {markingAttendance ? 'Saving…' : 'Mark'}
                    </button>
                  </div>
                </div>

                {/* Attendance records list */}
                {attendanceLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-surface-200 rounded-lg" />
                    ))}
                  </div>
                ) : attendanceData.length === 0 ? (
                  <p className="text-sm text-center text-surface-600 py-6">
                    No attendance records yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {attendanceData.map((record) => (
                      <div
                        key={record._id}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-surface-200"
                      >
                        <span className="text-sm text-surface-900">
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <StatusBadge status={record.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Daily Updates Tab ─────────────────────────────── */}
            {activeDetailTab === 'submissions' && (
              <div className="space-y-3 pt-1">
                {submissionsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-surface-200 rounded-xl" />
                    ))}
                  </div>
                ) : submissionsData.length === 0 ? (
                  <p className="text-sm text-center text-surface-600 py-8">
                    No daily updates submitted yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {submissionsData.map((sub) => (
                      <div
                        key={sub._id}
                        className="p-4 rounded-xl border border-surface-200 bg-white space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-surface-900">{sub.title}</p>
                          <span className="text-xs text-surface-600 whitespace-nowrap">
                            {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-surface-700">
                          <span className="font-medium">Work Done: </span>
                          {sub.workDone}
                        </p>
                        {sub.description && (
                          <p className="text-xs text-surface-600">{sub.description}</p>
                        )}
                        {sub.files?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.files.map((f, idx) => (
                              <a
                                key={idx}
                                href={`${BASE_URL}${f.path}`}
                                target="_blank"
                                rel="noreferrer"
                                download={f.originalName}
                                className="inline-flex items-center gap-1 text-xs text-primary-500
                                  hover:text-primary-600 border border-primary-500/30 rounded px-2 py-1"
                              >
                                <HiDownload className="w-3 h-3" />
                                {f.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </Modal>

      {/* ══ Evaluate Modal ════════════════════════════════════════ */}
      <Modal
        isOpen={!!evalModal}
        onClose={() => {
          setEvalModal(null);
          setEvalForm({ rating: 5, remarks: '' });
        }}
        title="Evaluate Internship"
        size="md"
      >
        {evalModal && (
          <form onSubmit={handleEvaluate} className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm text-surface-700">
                Student:{' '}
                <span className="font-semibold text-surface-900">
                  {evalModal.studentId?.name}
                </span>
              </p>
              <p className="text-sm text-surface-700">
                Company:{' '}
                <span className="font-semibold text-surface-900">
                  {evalModal.companyName}
                </span>
              </p>
            </div>

            {/* Star rating picker */}
            <div>
              <label className="input-label mb-2">Rating (1–5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEvalForm((p) => ({ ...p, rating: n }))}
                    className={`w-10 h-10 rounded-lg border text-sm font-bold transition-all ${
                      evalForm.rating >= n
                        ? 'bg-amber-400 text-white border-amber-400'
                        : 'border-surface-300 text-surface-600 hover:border-amber-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="input-label">Remarks / Feedback</label>
              <textarea
                value={evalForm.remarks}
                onChange={(e) => setEvalForm((p) => ({ ...p, remarks: e.target.value }))}
                className="input-field mt-1"
                rows={3}
                placeholder="Add feedback for the student…"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting…' : 'Submit Evaluation'}
              </button>
              <button
                type="button"
                onClick={() => setEvalModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InternshipReview;