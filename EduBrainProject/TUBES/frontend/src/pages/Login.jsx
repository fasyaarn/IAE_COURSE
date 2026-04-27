import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast, ToastContainer } from '../hooks/useToast';

export default function LoginPage() {
    const { login, register } = useAuth();
    const { toasts, addToast } = useToast();

    const [mode,   setMode]   = useState('login'); // 'login' | 'register'
    const [form,   setForm]   = useState({ name: '', email: '', password: '', phone: '', address: '' });
    const [busy,   setBusy]   = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            if (mode === 'login') {
                await login(form.email, form.password);
            } else {
                await register({ name: form.name, email: form.email, password: form.password, phone: form.phone, address: form.address });
            }
        } catch (err) {
            addToast(err.response?.data?.message || 'Something went wrong', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-bg-blobs">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
                <div className="blob blob-3" />
            </div>

            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">🧠</div>
                    <div>
                        <h1>EduBrain</h1>
                        <span>Learning Platform</span>
                    </div>
                </div>

                {/* Tab toggle */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                    >Sign In</button>
                    <button
                        className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => setMode('register')}
                    >Register</button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === 'register' && (
                        <>
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    className="form-control"
                                    placeholder="Your full name"
                                    value={form.name}
                                    onChange={e => set('name', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    className="form-control"
                                    placeholder="e.g. 08123456789"
                                    value={form.phone}
                                    onChange={e => set('phone', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input
                                    className="form-control"
                                    placeholder="City / Address"
                                    value={form.address}
                                    onChange={e => set('address', e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>Email *</label>
                        <input
                            className="form-control"
                            type="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password *</label>
                        <input
                            className="form-control"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button className="btn btn-primary auth-submit" disabled={busy}>
                        {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                {/* Demo credentials hint */}
                <div className="auth-hint">
                    <strong>Demo accounts:</strong><br />
                    Admin: <code>admin@edubrain.id</code> / <code>admin123</code><br />
                    Student: <code>fasya@edubrain.id</code> / <code>student123</code>
                </div>
            </div>

            <ToastContainer toasts={toasts} />
        </div>
    );
}
