import { useEffect, useState } from 'react';
import { attendanceAPI, studentAPI, courseAPI } from '../api/api';
import { useToast, ToastContainer } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const STATUS_OPTIONS = ['present', 'absent', 'late'];
const EMPTY = { student_id: '', course_id: '', date: new Date().toISOString().slice(0, 10), status: 'present', notes: '' };

export default function Attendance({ setTitle }) {
    const { user, isAdmin, isStudent } = useAuth();
    const [records,   setRecords]   = useState([]);
    const [students,  setStudents]  = useState([]);
    const [courses,   setCourses]   = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [modal,     setModal]     = useState(false);
    const [editId,    setEditId]    = useState(null);
    const [form,      setForm]      = useState(EMPTY);
    const [saving,    setSaving]    = useState(false);
    const [checking,  setChecking]  = useState(false);
    const [readStatus, setReadStatus] = useState(null); // null | { can_attend, message }
    const { toasts, addToast } = useToast();

    // Enrolled courses for student
    const [enrolledCourses, setEnrolledCourses] = useState([]);

    const load = () => {
        setLoading(true);
        const reqs = [attendanceAPI.getAll()];
        if (isAdmin) reqs.push(studentAPI.getAll(), courseAPI.getAll());
        else         reqs.push(api.get(`/enrollments/student/${user.student_id}`), courseAPI.getAll());

        Promise.all(reqs)
            .then(results => {
                setRecords(results[0].data.data);
                if (isAdmin) {
                    setStudents(results[1].data.data);
                    setCourses(results[2].data.data);
                } else {
                    const enrolled = results[1].data.data;
                    setEnrolledCourses(enrolled);
                    setCourses(results[2].data.data);
                }
            })
            .catch(() => addToast('Failed to load data', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { setTitle('Attendance'); load(); }, []);

    const filtered = records.filter(r =>
        (r.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.course_title || '').toLowerCase().includes(search.toLowerCase())
    );

    // When student picks a course, check if they've read the article
    const checkReadStatus = async (courseId) => {
        if (!courseId || isAdmin) { setReadStatus(null); return; }
        setChecking(true);
        try {
            const res = await api.get(`/articles/reads/check?course_id=${courseId}`);
            setReadStatus(res.data);
        } catch {
            setReadStatus(null);
        } finally {
            setChecking(false);
        }
    };

    const openAdd = () => {
        const initial = { ...EMPTY, student_id: isStudent ? user.student_id : '' };
        setForm(initial);
        setEditId(null);
        setReadStatus(null);
        setModal(true);
    };

    const openEdit = (r) => {
        setForm({ student_id: r.student_id, course_id: r.course_id, date: r.date?.slice(0, 10), status: r.status, notes: r.notes || '' });
        setEditId(r.id);
        setReadStatus(null);
        setModal(true);
    };

    const closeModal = () => { setModal(false); setReadStatus(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await attendanceAPI.update(editId, { status: form.status, notes: form.notes });
                addToast('Attendance updated');
            } else {
                await attendanceAPI.create(form);
                addToast('Attendance marked successfully ✅');
            }
            closeModal();
            load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Error saving record', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this attendance record?')) return;
        try {
            await attendanceAPI.delete(id);
            addToast('Record deleted');
            load();
        } catch { addToast('Failed to delete', 'error'); }
    };

    const countByStatus = (s) => records.filter(r => r.status === s).length;

    // Student: only show enrolled courses in the dropdown
    const attendableCourses = isStudent
        ? courses.filter(c => enrolledCourses.some(e => e.course_id === c.id && e.status === 'active'))
        : courses;

    return (
        <>
            <div className="section-header">
                <div>
                    <h2>✅ {isAdmin ? 'Attendance Management' : 'My Attendance'}</h2>
                    <p>{isAdmin ? 'Track and manage student attendance records' : 'Mark your attendance (requires reading course article)'}</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    {isAdmin ? '+ Mark Attendance' : '+ Mark My Attendance'}
                </button>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#6366f122', color: '#6366f1' }}>📋</div>
                    <div className="stat-card-count">{records.length}</div>
                    <div className="stat-card-label">Total Records</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#10b98122', color: '#10b981' }}>✅</div>
                    <div className="stat-card-count">{countByStatus('present')}</div>
                    <div className="stat-card-label">Present</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#ef444422', color: '#ef4444' }}>❌</div>
                    <div className="stat-card-count">{countByStatus('absent')}</div>
                    <div className="stat-card-label">Absent</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}>⏰</div>
                    <div className="stat-card-count">{countByStatus('late')}</div>
                    <div className="stat-card-label">Late</div>
                </div>
            </div>

            <div className="table-wrapper">
                <div className="table-search-bar">
                    <input className="search-input" placeholder="🔍 Search by student or course…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{filtered.length} records</span>
                </div>

                {loading ? (
                    <div className="spinner-wrapper"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <h3>No attendance records</h3>
                        <p>{isStudent ? 'Read the course article first, then mark attendance.' : 'Mark attendance to start tracking.'}</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                {isAdmin && <th>Student</th>}
                                <th>Course</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r, i) => (
                                <tr key={r.id}>
                                    <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                    {isAdmin && <td><strong>{r.student_name}</strong></td>}
                                    <td style={{ color: 'var(--text-muted)' }}>{r.course_title}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.date?.slice(0, 10)}</td>
                                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.notes || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>✏️ Edit</button>}
                                            {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>🗑️</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editId ? '✏️ Update Attendance' : '+ Mark Attendance'}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {!editId && (
                                    <>
                                        {isAdmin && (
                                            <div className="form-group">
                                                <label>Student *</label>
                                                <select className="form-control" required value={form.student_id}
                                                    onChange={e => setForm({ ...form, student_id: e.target.value })}>
                                                    <option value="">-- Select Student --</option>
                                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label>Course *</label>
                                            <select className="form-control" required value={form.course_id}
                                                onChange={e => {
                                                    setForm({ ...form, course_id: e.target.value });
                                                    checkReadStatus(e.target.value);
                                                }}>
                                                <option value="">-- Select Course --</option>
                                                {attendableCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                            </select>
                                        </div>

                                        {/* Article read gate indicator */}
                                        {isStudent && form.course_id && (
                                            <div className={`read-gate-banner ${checking ? 'checking' : readStatus?.can_attend ? 'ok' : 'blocked'}`}>
                                                {checking ? (
                                                    <span>⏳ Checking article status…</span>
                                                ) : readStatus ? (
                                                    readStatus.can_attend
                                                        ? <span>✅ {readStatus.message}</span>
                                                        : <span>🔒 {readStatus.message} — <a href="#articles" onClick={() => closeModal()}>Go to Articles →</a></span>
                                                ) : null}
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Date *</label>
                                            <input className="form-control" type="date" required value={form.date}
                                                onChange={e => setForm({ ...form, date: e.target.value })} />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label>Status</label>
                                    <select className="form-control" value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <input className="form-control" placeholder="Optional notes…"
                                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving || (isStudent && !editId && readStatus !== null && !readStatus.can_attend)}
                                >
                                    {saving ? 'Saving…' : editId ? 'Update' : 'Mark'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} />
        </>
    );
}
