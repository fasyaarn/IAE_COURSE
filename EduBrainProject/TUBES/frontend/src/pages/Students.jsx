import { useEffect, useState } from 'react';
import { studentAPI } from '../api/api';
import { useToast, ToastContainer } from '../hooks/useToast';

const EMPTY = { name: '', email: '', phone: '', address: '' };

export default function Students({ setTitle }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null); // null | 'add' | 'edit'
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const { toasts, addToast } = useToast();

    const load = () => {
        setLoading(true);
        studentAPI.getAll()
            .then(r => setStudents(r.data.data))
            .catch(() => addToast('Failed to load students', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { setTitle('Students'); load(); }, []);

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('form'); };
    const openEdit = (s) => { setForm({ name: s.name, email: s.email, phone: s.phone || '', address: s.address || '' }); setEditId(s.id); setModal('form'); };
    const closeModal = () => { setModal(null); setForm(EMPTY); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                await studentAPI.update(editId, form);
                addToast('Student updated successfully');
            } else {
                await studentAPI.create(form);
                addToast('Student registered successfully');
            }
            closeModal();
            load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Error saving student', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await studentAPI.delete(id);
            addToast('Student deleted');
            load();
        } catch (err) {
            addToast('Failed to delete student', 'error');
        }
    };

    const initials = name => name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

    return (
        <>
            <div className="section-header">
                <div>
                    <h2>👤 Student Management</h2>
                    <p>Manage student registrations and profiles</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Register Student</button>
            </div>

            <div className="table-wrapper">
                <div className="table-search-bar">
                    <input className="search-input" placeholder="🔍 Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{filtered.length} students</span>
                </div>

                {loading ? (
                    <div className="spinner-wrapper"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👤</div>
                        <h3>No students found</h3>
                        <p>Register your first student to get started.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, i) => (
                                <tr key={s.id}>
                                    <td style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                    <td>
                                        <div className="avatar-cell">
                                            <div className="avatar">{initials(s.name)}</div>
                                            <div>
                                                <strong>{s.name}</strong>
                                                <small>{s.email}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{s.address || '—'}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(s.created_at).toLocaleDateString('id-ID')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}>🗑️ Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modal === 'form' && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editId ? '✏️ Edit Student' : '+ Register Student'}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input className="form-control" required placeholder="e.g. Fasya Arinal Hudha" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input className="form-control" type="email" required placeholder="student@edubrain.id" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input className="form-control" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input className="form-control" placeholder="City" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving…' : editId ? 'Save Changes' : 'Register'}
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
