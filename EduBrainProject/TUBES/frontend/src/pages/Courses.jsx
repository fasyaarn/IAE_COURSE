import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseAPI } from '../api/api';
import { useToast, ToastContainer } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

const EMPTY = { title: '', description: '', instructor: '', credits: 3 };

export default function Courses({ setTitle }) {
    const { user, isAdmin, isStudent } = useAuth();
    const navigate = useNavigate();
    const [courses,       setCourses]       = useState([]);
    const [enrolledIds,   setEnrolledIds]   = useState(new Set());
    const [loading,       setLoading]       = useState(true);
    const [search,        setSearch]        = useState('');
    const [modal,         setModal]         = useState(false);
    const [form,          setForm]          = useState(EMPTY);
    const [editId,        setEditId]        = useState(null);
    const [saving,        setSaving]        = useState(false);
    const { toasts, addToast } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const r = await courseAPI.getAll();
            setCourses(r.data.data);

            if (isStudent) {
                const e = await api.get(`/enrollments/student/${user.student_id}`);
                setEnrolledIds(new Set(e.data.data.map(en => en.course_id)));
            }
        } catch {
            addToast('Failed to load courses', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setTitle('Courses'); load(); }, []);

    const filtered = courses.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.instructor || '').toLowerCase().includes(search.toLowerCase())
    );

    // ── Admin CRUD ─────────────────────────────────────────────
    const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
    const openEdit = (c, e) => { e.stopPropagation(); setForm({ title: c.title, description: c.description || '', instructor: c.instructor || '', credits: c.credits }); setEditId(c.id); setModal(true); };
    const closeModal = () => setModal(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await courseAPI.update(editId, form);
                addToast('Course updated');
            } else {
                await courseAPI.create(form);
                addToast('Course added');
            }
            closeModal(); load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Error saving course', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id, title, e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${title}"?`)) return;
        try {
            await courseAPI.delete(id);
            addToast('Course deleted');
            load();
        } catch { addToast('Failed to delete course', 'error'); }
    };

    return (
        <>
            <div className="section-header">
                <div>
                    <h2>📚 {isAdmin ? 'Course Management' : 'Available Courses'}</h2>
                    <p>{isAdmin ? 'Add, edit, and manage courses' : 'Click a course to view details, read the article, and mark attendance'}</p>
                </div>
                {isAdmin && <button className="btn btn-primary" onClick={openAdd}>+ Add Course</button>}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 20 }}>
                <input className="search-input" style={{ maxWidth: 360 }}
                    placeholder="🔍 Search by title or instructor…"
                    value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="spinner-wrapper"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h3>No courses found</h3>
                    <p>{isAdmin ? 'Add your first course.' : 'No courses available yet.'}</p>
                </div>
            ) : isAdmin ? (
                /* ── Admin: Table view ── */
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Course Title</th>
                                <th>Instructor</th>
                                <th>Credits</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/courses/${c.id}`)}>
                                    <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                    <td><strong>{c.title}</strong></td>
                                    <td style={{ color: 'var(--text-muted)' }}>{c.instructor || '—'}</td>
                                    <td><span className="badge badge-active">{c.credits} SKS</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.description || '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={(e) => openEdit(c, e)}>✏️ Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(c.id, c.title, e)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* ── Student: Card grid ── */
                <div className="course-cards-grid">
                    {filtered.map(c => {
                        const enrolled = enrolledIds.has(c.id);
                        return (
                            <div key={c.id} className={`course-card ${enrolled ? 'enrolled' : ''}`}
                                onClick={() => navigate(`/courses/${c.id}`)}>
                                <div className="course-card-header">
                                    <span className="course-card-credits">{c.credits} SKS</span>
                                    {enrolled && <span className="badge badge-active">✓ Enrolled</span>}
                                </div>
                                <h3 className="course-card-title">{c.title}</h3>
                                <p className="course-card-instructor">👨‍🏫 {c.instructor || 'TBD'}</p>
                                {c.description && (
                                    <p className="course-card-desc">{c.description.slice(0, 80)}{c.description.length > 80 ? '…' : ''}</p>
                                )}
                                <div className="course-card-footer">
                                    <span className="course-card-action">
                                        {enrolled ? '📖 View & Attend →' : '🎓 Click to Enroll →'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Admin Create/Edit Modal */}
            {isAdmin && modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editId ? '✏️ Edit Course' : '+ Add Course'}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Course Title *</label>
                                    <input className="form-control" required placeholder="e.g. Web Programming"
                                        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Instructor</label>
                                        <input className="form-control" placeholder="Dr. Ahmad"
                                            value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Credits (SKS)</label>
                                        <input className="form-control" type="number" min={1} max={6}
                                            value={form.credits} onChange={e => setForm({ ...form, credits: +e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea className="form-control" rows={3} placeholder="Course description…"
                                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Course'}
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
