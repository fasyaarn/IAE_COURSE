import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast, ToastContainer } from '../hooks/useToast';
import api from '../api/api';

export default function Articles({ setTitle }) {
    const { user, isAdmin } = useAuth();
    const { toasts, addToast } = useToast();

    const [articles, setArticles] = useState([]);
    const [courses,  setCourses]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [reading,  setReading]  = useState(null); // article being read
    const [modal,    setModal]    = useState(false); // admin create/edit modal
    const [editId,   setEditId]   = useState(null);
    const [form,     setForm]     = useState({ title: '', content: '', course_id: '' });
    const [saving,   setSaving]   = useState(false);
    const [readTimer, setReadTimer] = useState(0);   // seconds student has spent reading
    const [canMark,  setCanMark]  = useState(false); // true after 10 seconds

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get('/articles'),
            api.get('/courses'),
        ])
            .then(([a, c]) => {
                setArticles(a.data.data);
                setCourses(c.data.data);
            })
            .catch(() => addToast('Failed to load articles', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { setTitle('Articles'); load(); }, []);

    // --- Read timer: tick every second while a student is reading ---
    useEffect(() => {
        if (!reading || isAdmin) return;
        setReadTimer(0);
        setCanMark(false);
        const interval = setInterval(() => {
            setReadTimer(t => {
                const next = t + 1;
                if (next >= 10) setCanMark(true);
                return next;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [reading]);

    const openRead = (article) => {
        setReading(article);
        setCanMark(article.is_read); // if already read, immediately enabled
    };

    const markAsRead = async () => {
        if (!reading) return;
        try {
            await api.post(`/articles/${reading.id}/read`);
            addToast('✅ Article marked as read! You can now attend this course.');
            setReading(null);
            load(); // refresh is_read flags
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to mark as read', 'error');
        }
    };

    // Admin CRUD
    const openCreate = () => { setForm({ title: '', content: '', course_id: '' }); setEditId(null); setModal(true); };
    const openEdit   = (a) => { setForm({ title: a.title, content: a.content, course_id: a.course_id || '' }); setEditId(a.id); setModal(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await api.put(`/articles/${editId}`, form);
                addToast('Article updated');
            } else {
                await api.post('/articles', form);
                addToast('Article created');
            }
            setModal(false);
            load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this article?')) return;
        try {
            await api.delete(`/articles/${id}`);
            addToast('Article deleted');
            load();
        } catch { addToast('Delete failed', 'error'); }
    };

    const courseTitle = (id) => courses.find(c => c.id == id)?.title || '—';

    return (
        <>
            <div className="section-header">
                <div>
                    <h2>📰 Articles</h2>
                    <p>{isAdmin ? 'Manage learning articles for students' : 'Read articles to unlock course attendance'}</p>
                </div>
                {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ New Article</button>}
            </div>

            {loading ? (
                <div className="spinner-wrapper"><div className="spinner" /></div>
            ) : articles.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📰</div>
                    <h3>No articles yet</h3>
                    <p>{isAdmin ? 'Create the first learning article.' : 'No articles available.'}</p>
                </div>
            ) : (
                <div className="articles-grid">
                    {articles.map(a => (
                        <div key={a.id} className={`article-card ${a.is_read ? 'read' : ''}`}>
                            <div className="article-card-meta">
                                <span className="article-course-badge">{courseTitle(a.course_id)}</span>
                                {!isAdmin && (
                                    <span className={`badge ${a.is_read ? 'badge-active' : 'badge-dropped'}`}>
                                        {a.is_read ? '✅ Read' : '📖 Unread'}
                                    </span>
                                )}
                            </div>
                            <h3 className="article-card-title">{a.title}</h3>
                            <p className="article-card-preview">
                                {a.content.replace(/[#*`]/g, '').slice(0, 120)}…
                            </p>
                            <div className="article-card-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => openRead(a)}>
                                    {a.is_read ? '👁️ Read Again' : '📖 Read Article'}
                                </button>
                                {isAdmin && (
                                    <>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>✏️ Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>🗑️</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Article Reader Modal ── */}
            {reading && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReading(null)}>
                    <div className="modal modal-reader">
                        <div className="modal-header">
                            <h3>📰 {reading.title}</h3>
                            <button className="modal-close" onClick={() => setReading(null)}>✕</button>
                        </div>
                        <div className="modal-body reader-body">
                            <div className="article-course-badge" style={{ marginBottom: 16 }}>
                                {courseTitle(reading.course_id)}
                            </div>
                            <div className="article-content">
                                {reading.content.split('\n').map((line, i) => {
                                    if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
                                    if (line.startsWith('# '))  return <h1 key={i}>{line.slice(2)}</h1>;
                                    if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.slice(2, -2)}</strong>;
                                    if (!line.trim()) return <br key={i} />;
                                    return <p key={i}>{line}</p>;
                                })}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ flexDirection: 'column', gap: 12 }}>
                            {!isAdmin && !reading.is_read && (
                                <div className="read-timer-bar">
                                    <div className="read-timer-fill" style={{ width: `${Math.min(readTimer / 10 * 100, 100)}%` }} />
                                </div>
                            )}
                            {!isAdmin && (
                                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                    <button className="btn btn-secondary" onClick={() => setReading(null)}>Close</button>
                                    {reading.is_read ? (
                                        <button className="btn btn-primary" disabled style={{ flex: 1 }}>✅ Already Read</button>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ flex: 1 }}
                                            disabled={!canMark}
                                            onClick={markAsRead}
                                        >
                                            {canMark ? '✅ Mark as Read' : `Please read… (${10 - readTimer}s)`}
                                        </button>
                                    )}
                                </div>
                            )}
                            {isAdmin && <button className="btn btn-secondary" onClick={() => setReading(null)}>Close</button>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Admin Create/Edit Modal ── */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editId ? '✏️ Edit Article' : '+ New Article'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input className="form-control" required value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Course</label>
                                    <select className="form-control" value={form.course_id}
                                        onChange={e => setForm({ ...form, course_id: e.target.value })}>
                                        <option value="">-- Not linked to a course --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Content * (Markdown supported: ## H2, **bold**)</label>
                                    <textarea className="form-control" rows={10} required value={form.content}
                                        onChange={e => setForm({ ...form, content: e.target.value })}
                                        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
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
