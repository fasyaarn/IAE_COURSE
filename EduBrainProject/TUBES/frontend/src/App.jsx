import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './index.css';
import Dashboard    from './pages/Dashboard';
import Students     from './pages/Students';
import Courses      from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Enrollments  from './pages/Enrollments';
import Attendance   from './pages/Attendance';
import Articles     from './pages/Articles';
import Login        from './pages/Login';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Navigation config (role-aware) ──────────────────────────
const NAV_ADMIN = [
    { path: '/',            label: 'Dashboard',   icon: '📊', group: 'Overview' },
    { path: '/students',    label: 'Students',    icon: '👤', group: 'Management' },
    { path: '/courses',     label: 'Courses',     icon: '📚', group: 'Management' },
    { path: '/articles',    label: 'Articles',    icon: '📰', group: 'Management' },
    { path: '/enrollments', label: 'Enrollments', icon: '🎓', group: 'Management' },
    { path: '/attendance',  label: 'Attendance',  icon: '✅', group: 'Management' },
];

const NAV_STUDENT = [
    { path: '/',            label: 'Dashboard',   icon: '📊', group: 'Overview' },
    { path: '/courses',     label: 'Courses',     icon: '📚', group: 'My Learning' },
    { path: '/articles',    label: 'Articles',    icon: '📰', group: 'My Learning' },
    { path: '/enrollments', label: 'My Enrollments', icon: '🎓', group: 'My Learning' },
    { path: '/attendance',  label: 'Attendance',  icon: '✅', group: 'My Learning' },
];

function AppShell() {
    const { user, isAdmin, logout, loading } = useAuth();
    const [pageTitle, setPageTitle] = useState('Dashboard');

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!user) return <Login />;

    const NAV = isAdmin ? NAV_ADMIN : NAV_STUDENT;
    const groups = [...new Set(NAV.map(n => n.group))];

    return (
        <div className="app-shell">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">🧠</div>
                    <div>
                        <h1>EduBrain</h1>
                        <span>Learning Platform</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {groups.map(group => (
                        <div key={group}>
                            <div className="nav-group-label">{group}</div>
                            {NAV.filter(n => n.group === group).map(n => (
                                <NavLink
                                    key={n.path}
                                    to={n.path}
                                    end={n.path === '/'}
                                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                                    onClick={() => setPageTitle(n.label)}
                                >
                                    <span className="nav-icon">{n.icon}</span>
                                    {n.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.name}</div>
                        <div className={`sidebar-user-role ${user.role}`}>{user.role}</div>
                    </div>
                    <button className="sidebar-logout" onClick={logout} title="Sign Out">⏻</button>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="main-content">
                <header className="topbar">
                    <div className="topbar-title">{pageTitle}</div>
                    <div className="topbar-right">
                        <span className="topbar-badge">{isAdmin ? '🛡️ Admin' : '🎓 Student'}</span>
                    </div>
                </header>

                <div className="page">
                    <Routes>
                        <Route path="/"              element={<Dashboard   setTitle={setPageTitle} />} />
                        <Route path="/courses"       element={<Courses     setTitle={setPageTitle} />} />
                        <Route path="/courses/:id"   element={<CourseDetail setTitle={setPageTitle} />} />
                        <Route path="/articles"      element={<Articles    setTitle={setPageTitle} />} />
                        <Route path="/enrollments"   element={<Enrollments setTitle={setPageTitle} />} />
                        <Route path="/attendance"    element={<Attendance  setTitle={setPageTitle} />} />
                        {/* Admin-only routes */}
                        {isAdmin && <Route path="/students" element={<Students setTitle={setPageTitle} />} />}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppShell />
            </Router>
        </AuthProvider>
    );
}

export default App;
