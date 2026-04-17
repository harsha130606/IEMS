import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { HiEye, HiPaperClip, HiDownload, HiUpload } from 'react-icons/hi';

const BASE_URL = 'http://localhost:5000';

const MyInternships = () => {
  // ── Existing state ──────────────────────────────────────────
  const [internships, setInternships]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detailModal, setDetailModal]   = useState(null);
  const [filter, setFilter]             = useState('All');

  // ── New state ───────────────────────────────────────────────
  const [activeDetailTab, setActiveDetailTab]       = useState('details');
  const [attendanceData, setAttendanceData]         = useState([]);
  const [attendanceLoading, setAttendanceLoading]   = useState(false);
  const [submissionsData, setSubmissionsData]       = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [subForm, setSubForm] = useState({ title: '', workDone: '', description: '' });
  const [subFiles, setSubFiles]       = useState(null);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchInternships();
  }, []);

  // Reset tabs + clear cached data each time a different internship is opened
  useEffect(() => {
    if (detailModal) {
      setActiveDetailTab('details');
      setAttendanceData([]);
      setSubmissionsData([]);
      setSubForm({ title: '', workDone: '', description: '' });
      setSubFiles(null);
    }
  }, [detailModal?._id]);

  // ── Data fetchers ────────────────────────────────────────────
  const fetchInternships = async () => {
    try {
      const { data } = await api.get('/api/student/internships');
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
      const { data } = await api.get(`/api/student/internships/${id}/attendance`);
      setAttendanceData(data);
    } catch {
      // Silently ignore — controller returns 403 if not accepted
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchSubmissions = async (id) => {
    setSubmissionsLoading(true);
    try {
      const { data } = await api.get(`/api/student/internships/${id}/submissions`);
      setSubmissionsData(data);
    } catch {
      // Silently ignore
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveDetailTab(tab);
    if (tab === 'attendance') fetchAttendance(detailModal._id);
    if (tab === 'updates') fetchSubmissions(detailModal._id);
  };

  // ── Submit daily update ──────────────────────────────────────
  const handleAddSubmission = async (e) => {
    e.preventDefault();
    if (!subForm.title.trim() || !subForm.workDone.trim()) {
      toast.error('Title and Work Done are required');
      return;
    }
    setSubmittingUpdate(true);
    try {
      const formData = new FormData();
      formData.append('title', subForm.title);
      formData.append('workDone', subForm.workDone);
      formData.append('description', subForm.description);
      if (subFiles) {
        Array.from(subFiles).forEach((file) => formData.append('files', file));
      }

      await api.post(
        `/api/student/internships/${detailModal._id}/submissions`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Daily update submitted!');
      setSubForm({ title: '', workDone: '', description: '' });
      setSubFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSubmissions(detailModal._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────
  const filteredInternships =
    filter === 'All' ? internships : internships.filter((i) => i.status === filter);

  // ── Table columns ─────────────────────────────────────────────
  const columns = [
    { 
      key: 'companyName', 
      header: 'Company', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-surface-900">{row.companyName}</span>
          <span className="text-xs text-surface-500">ID: {row._id.slice(-6).toUpperCase()}</span>
        </div>
      )
    },
    {
      key: 'paid',
      header: 'Type',
      render: (row) => <StatusBadge status={row.paid ? 'Paid' : 'Unpaid'} />,
    },
    {
      key: 'startDate',
      header: 'Start Date',
      accessor: (row) => new Date(row.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'endDate',
      header: 'End Date',
      accessor: (row) => new Date(row.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
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
      key: 'rating',
      header: 'Evaluation',
      render: (row) =>
        row.evaluation?.rating ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-base ${i < row.evaluation.rating ? 'text-amber-500' : 'text-surface-200'}`}>★</span>
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-bold">Rated</span>
          </div>
        ) : (
          <span className="text-surface-400 italic text-xs">Waiting...</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (row) => (
        <button
          onClick={() => setDetailModal(row)}
          className="p-2.5 rounded-xl bg-surface-100 text-surface-600 hover:bg-primary-500 hover:text-white transition-all duration-200 shadow-sm"
          title="View Details"
        >
          <HiEye className="w-4.5 h-4.5" />
        </button>
      ),
    },
  ];

  // Tabs available in the detail modal
  const detailTabs = [
    { key: 'details', label: 'Details' },
    ...(detailModal?.status === 'Accepted'
      ? [
          { key: 'attendance', label: 'Attendance' },
          { key: 'updates', label: 'Daily Updates' },
        ]
      : []),
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-surface-950">My Internships</h1>
          <p className="text-surface-600 mt-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Track and manage your {internships.length} applications
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-surface-200/50 rounded-2xl border border-surface-200">
          {['All', 'Pending', 'Accepted', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300
                ${
                  filter === status
                    ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/5'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-white/40'
                }`}
            >
              {status}
              {status !== 'All' && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md ${filter === status ? 'bg-primary-50 text-primary-600' : 'bg-surface-300 text-surface-600'}`}>
                  {internships.filter((i) => i.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card animate-pulse h-64" />
      ) : (
        <DataTable columns={columns} data={filteredInternships} />
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
                    <p className="text-xs text-surface-700 mb-1">Company</p>
                    <p className="text-surface-900 font-medium">{detailModal.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Type</p>
                    <StatusBadge status={detailModal.paid ? 'Paid' : 'Unpaid'} />
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Start Date</p>
                    <p className="text-surface-900">
                      {new Date(detailModal.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">End Date</p>
                    <p className="text-surface-900">
                      {new Date(detailModal.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Duration</p>
                    <p className="text-surface-900">{detailModal.durationDays} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Status</p>
                    <StatusBadge status={detailModal.status} />
                  </div>
                </div>

                {/* Assigned Faculty */}
                {detailModal.facultyId && (
                  <div>
                    <p className="text-xs text-surface-700 mb-1">Assigned Faculty</p>
                    <p className="text-surface-900 font-medium">{detailModal.facultyId.name}</p>
                    <p className="text-xs text-surface-700">{detailModal.facultyId.email}</p>
                  </div>
                )}

                {/* Documents */}
                <div className="flex gap-4 flex-wrap">
                  {detailModal.certificate && (
                    <a
                      href={detailModal.certificate}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10
                        border border-primary-500/30 text-primary-400 hover:bg-primary-500/20
                        transition-all text-sm font-medium"
                    >
                      📄 Certificate
                    </a>
                  )}
                  {detailModal.lor && (
                    <a
                      href={detailModal.lor}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10
                        border border-primary-500/30 text-primary-400 hover:bg-primary-500/20
                        transition-all text-sm font-medium"
                    >
                      📄 LOR
                    </a>
                  )}
                </div>

                {/* Evaluation (if any) */}
                {detailModal.evaluation?.rating && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                      Faculty Evaluation
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-amber-400">
                        {'★'.repeat(detailModal.evaluation.rating)}
                      </span>
                      <span className="text-2xl text-surface-600">
                        {'★'.repeat(5 - detailModal.evaluation.rating)}
                      </span>
                      <span className="text-sm text-surface-700 ml-2">
                        ({detailModal.evaluation.rating}/5)
                      </span>
                    </div>
                    {detailModal.evaluation.remarks && (
                      <div className="mt-3 p-3 rounded-lg bg-surface-200">
                        <p className="text-xs text-surface-700 mb-1">Remarks</p>
                        <p className="text-sm text-surface-700 leading-relaxed">
                          {detailModal.evaluation.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Attendance Tab (view-only for student) ─────────── */}
            {activeDetailTab === 'attendance' && (
              <div className="space-y-3 pt-1">
                {attendanceLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-surface-200 rounded-lg" />
                    ))}
                  </div>
                ) : attendanceData.length === 0 ? (
                  <p className="text-sm text-center text-surface-600 py-8">
                    No attendance records yet
                  </p>
                ) : (
                  <>
                    {/* Summary strip */}
                    <div className="flex gap-4 p-3 rounded-xl bg-surface-50 border border-surface-200 text-sm">
                      <span>
                        <span className="font-semibold text-emerald-600">
                          {attendanceData.filter((r) => r.status === 'Present').length}
                        </span>{' '}
                        Present
                      </span>
                      <span>
                        <span className="font-semibold text-red-500">
                          {attendanceData.filter((r) => r.status === 'Absent').length}
                        </span>{' '}
                        Absent
                      </span>
                      <span className="text-surface-600">
                        Total: {attendanceData.length} days
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
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
                  </>
                )}
              </div>
            )}

            {/* ── Daily Updates Tab ─────────────────────────────── */}
            {activeDetailTab === 'updates' && (
              <div className="space-y-4 pt-1">

                {/* Submission form */}
                <form
                  onSubmit={handleAddSubmission}
                  className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3"
                >
                  <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    New Daily Update
                  </p>

                  <div>
                    <label className="input-label">Title *</label>
                    <input
                      type="text"
                      value={subForm.title}
                      onChange={(e) => setSubForm((p) => ({ ...p, title: e.target.value }))}
                      className="input-field mt-1"
                      placeholder="e.g. Day 3 — API integration"
                    />
                  </div>

                  <div>
                    <label className="input-label">Work Done *</label>
                    <textarea
                      value={subForm.workDone}
                      onChange={(e) => setSubForm((p) => ({ ...p, workDone: e.target.value }))}
                      className="input-field mt-1"
                      rows={2}
                      placeholder="What did you accomplish today?"
                    />
                  </div>

                  <div>
                    <label className="input-label">Description</label>
                    <textarea
                      value={subForm.description}
                      onChange={(e) =>
                        setSubForm((p) => ({ ...p, description: e.target.value }))
                      }
                      className="input-field mt-1"
                      rows={2}
                      placeholder="Additional notes or observations…"
                    />
                  </div>

                  <div>
                    <label className="input-label">
                      Attachments{' '}
                      <span className="text-surface-500 font-normal">
                        (PDF, PNG, JPG, ZIP, DOC, DOCX — max 5 files, 5MB each)
                      </span>
                    </label>
                    <label
                      className="mt-1 flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg
                        border border-dashed border-surface-300 hover:border-primary-400
                        bg-white text-sm text-surface-600 hover:text-primary-500 transition-colors"
                    >
                      <HiUpload className="w-4 h-4" />
                      {subFiles && subFiles.length > 0
                        ? `${subFiles.length} file(s) selected`
                        : 'Choose files…'}
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx"
                        ref={fileInputRef}
                        onChange={(e) => setSubFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingUpdate}
                    className="btn-primary w-full"
                  >
                    {submittingUpdate ? 'Submitting…' : 'Submit Update'}
                  </button>
                </form>

                {/* Submissions list */}
                {submissionsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-24 bg-surface-200 rounded-xl" />
                    ))}
                  </div>
                ) : submissionsData.length === 0 ? (
                  <p className="text-sm text-center text-surface-600 py-4">
                    No updates submitted yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {submissionsData.map((sub) => (
                      <div
                        key={sub._id}
                        className="p-4 rounded-xl border border-surface-200 bg-white space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-surface-900">{sub.title}</p>
                          <span className="text-xs text-surface-500 whitespace-nowrap">
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
    </div>
  );
};

export default MyInternships;
