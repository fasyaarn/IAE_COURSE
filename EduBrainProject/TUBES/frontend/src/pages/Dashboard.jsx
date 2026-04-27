import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI, courseAPI, enrollmentAPI, attendanceAPI } from '../api/api';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const CARDS = [
    { label: 'Total Students', icon: '👤', color: '#6366f1', api: studentAPI.getAll },
    { label: 'Total Courses',  icon: '📚', color: '#06b6d4', api: courseAPI.getAll },
    { label: 'Enrollments',    icon: '🎓', color: '#10b981', api: enrollmentAPI.getAll },
    { label: 'Attendance Logs',icon: '✅', color: '#f59e0b', api: attendanceAPI.getAll },
];

export default function Dashboard({ setTitle }) {
    const { user, isAdmin, isStudent } = useAuth();
    
    useEffect(() => {
        setTitle('Dashboard');
    }, [setTitle]);

    if (isStudent) return <StudentDashboard user={user} />;
    return <AdminDashboard />;
}

function AdminDashboard() {
    const [counts, setCounts] = useState([0, 0, 0, 0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all(CARDS.map(c => c.api().catch(() => ({ data: { data: [] } })))).then(results => {
            setCounts(results.map(r => (r.data?.data || []).length));
            setLoading(false);
        });
    }, []);

    return (
        <>
            <div className="welcome-banner">
                <h2>Welcome to EduBrain 🧠</h2>
                <p>Online Learning Platform — Group 5 · IAE Semester 4 · Telkom University</p>
            </div>

            <div className="stats-grid">
                {CARDS.map((c, i) => (
                    <div className="stat-card" key={c.label} style={{ '--accent': c.color }}>
                        <div className="stat-card-icon" style={{ background: c.color + '22', color: c.color }}>
                            {c.icon}
                        </div>
                        <div className="stat-card-count">{loading ? '—' : counts[i]}</div>
                        <div className="stat-card-label">{c.label}</div>
                    </div>
                ))}
            </div>

            <div className="table-wrapper">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📡 API Endpoints</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Microservices running at <code style={{ color: 'var(--primary-light)' }}>http://localhost:5000</code>
                    </p>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['Student', 'GET',    '/api/students',                      'Get all students'],
                            ['Course',  'GET',    '/api/courses',                       'Display courses'],
                            ['Enrollment','POST', '/api/enrollments',                   'Enroll student'],
                            ['Attendance','POST', '/api/attendance',                    'Mark attendance'],
                        ].map(([svc, method, ep, desc], i) => (
                            <tr key={i}>
                                <td><span className={`badge badge-${svc === 'Student' ? 'active' : svc === 'Course' ? 'completed' : svc === 'Enrollment' ? 'late' : 'present'}`}>{svc}</span></td>
                                <td><code style={{ fontSize: 12, color: method === 'GET' ? '#10b981' : method === 'POST' ? '#6366f1' : method === 'PUT' ? '#f59e0b' : '#ef4444' }}>{method}</code></td>
                                <td><code style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ep}</code></td>
                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function StudentDashboard({ user }) {
    const navigate = useNavigate();
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProgress = async () => {
            try {
                // Fetch enrollments, articles, and attendance
                const [enrRes, artRes, attRes] = await Promise.all([
                    api.get(`/enrollments/student/${user.student_id}`),
                    api.get('/articles'),
                    api.get(`/attendance/student/${user.student_id}`)
                ]);

                const enrollments = enrRes.data.data;
                const articles = artRes.data.data;
                const attendance = attRes.data.data;

                const todayStr = new Date().toISOString().slice(0, 10);

                const courseProgress = enrollments.map(enr => {
                    const linkedArt = articles.find(a => String(a.course_id) === String(enr.course_id));
                    const todayAtt = attendance.find(a => String(a.course_id) === String(enr.course_id) && a.date?.slice(0, 10) === todayStr);

                    let step = 1; // Enrolled
                    if (!linkedArt || linkedArt.is_read) step = 2; // Read article (or no article needed)
                    if (todayAtt) step = 3; // Attended today

                    const pct = Math.round((step / 3) * 100);

                    return {
                        course: enr,
                        article: linkedArt,
                        attended: !!todayAtt,
                        step,
                        pct
                    };
                });

                setProgress(courseProgress);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadProgress();
    }, [user.student_id]);

    if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;

    return (
        <>
            <div className="welcome-banner">
                <h2>Welcome back, {user.name}! 🎓</h2>
                <p>Track your learning progress for today.</p>
            </div>

            <div className="section-header" style={{ marginTop: 32 }}>
                <div>
                    <h2>📈 My Progress (Today)</h2>
                    <p>Continue where you left off</p>
                </div>
            </div>

            {progress.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div className="empty-icon">🌱</div>
                    <h3>No Active Courses</h3>
                    <p>Go to the Courses page to enroll and start your learning journey.</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/courses')}>Browse Courses</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {progress.map(p => (
                        <div key={p.course.course_id} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 24, cursor: 'pointer' }} onClick={() => navigate(`/courses/${p.course.course_id}`)}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{p.course.course_title}</h3>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: p.pct === 100 ? '#10b981' : 'var(--primary)' }}>
                                        {p.pct === 100 ? '✅ Completed Today' : `${p.pct}%`}
                                    </span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct === 100 ? '#10b981' : 'var(--primary)', transition: 'width 0.5s ease' }} />
                                </div>

                                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span style={{ color: p.step >= 1 ? '#10b981' : 'inherit' }}>✓ Enrolled</span>
                                    <span>→</span>
                                    <span style={{ color: p.step >= 2 ? '#10b981' : 'inherit' }}>
                                        {p.article ? (p.step >= 2 ? '✓ Article Read' : '📰 Read Article') : '✓ No Article'}
                                    </span>
                                    <span>→</span>
                                    <span style={{ color: p.step === 3 ? '#10b981' : 'inherit' }}>
                                        {p.step === 3 ? '✓ Attended' : '✅ Mark Attendance'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                                <button className="btn btn-secondary btn-sm">Continue →</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

