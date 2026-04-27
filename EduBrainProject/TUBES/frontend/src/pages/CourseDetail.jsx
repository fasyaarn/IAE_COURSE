import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast, ToastContainer } from '../hooks/useToast';
import api from '../api/api';

const READ_SECONDS = 15; // seconds student must spend reading
const DEADLINE_SECONDS = 40; // max seconds before being marked absent

export default function CourseDetail({ setTitle }) {
    const { id } = useParams();
    const { user, isAdmin, isStudent } = useAuth();
    const navigate = useNavigate();
    const { toasts, addToast } = useToast();

    const [course,      setCourse]      = useState(null);
    const [article,     setArticle]     = useState(null);   // linked article (if any)
    const [enrollment,  setEnrollment]  = useState(null);   // student's enrollment
    const [attendance,  setAttendance]  = useState(null);   // today's attendance record
    const [loading,     setLoading]     = useState(true);

    // Reading state
    const [reading,     setReading]     = useState(false);  // expanded reader visible
    const [readSecs,    setReadSecs]    = useState(0);
    const [timeLeft,    setTimeLeft]    = useState(DEADLINE_SECONDS);
    const [isRead,      setIsRead]      = useState(false);
    const timerRef = useRef(null);

    // GLOBAL TIMER (NEW 🔥)
    const [sessionTime, setSessionTime] = useState(DEADLINE_SECONDS);
    const sessionRef = useRef(null);

    // Auto-attendance state
    const [marking,     setMarking]     = useState(false);
    const [attended,    setAttended]    = useState(false);

    const todayStr = new Date().toISOString().slice(0, 10);

    /* ── GLOBAL TIMER: kalau gak mulai baca ── */
    useEffect(() => {
        if (isStudent && enrollment && !attended && !reading && !isRead) {
            clearInterval(sessionRef.current);
            setSessionTime(DEADLINE_SECONDS);
            sessionRef.current = setInterval(() => {
                setSessionTime(t => t - 1);
            }, 1000);
        }
        return () => clearInterval(sessionRef.current);
    }, [enrollment, attended, reading, isRead, isStudent]);

    /* 🔥 AUTO ABSENT (tidak baca sama sekali) */
    useEffect(() => {
        if (
            isStudent &&
            enrollment &&
            !reading &&
            !isRead &&
            sessionTime <= 0 &&
            !attended
        ) {
            clearInterval(sessionRef.current);
            markAttendance(
                'absent',
                'Did not start reading the article within the allowed time'
            );
        }
    }, [sessionTime, reading, isRead, attended, isStudent, enrollment]);

    /* 🔥 AUTO ABSENT (lagi baca tapi kehabisan waktu) */
    useEffect(() => {
        if (reading && !isRead && timeLeft <= 0 && !attended) {
            clearInterval(timerRef.current);
            setReading(false);
            markAttendance('absent', 'Time limit exceeded while reading');
        }
    }, [timeLeft, reading, isRead, attended]);

    /* ── Load all data ─────────────────────────────────────── */
    const load = async () => {
        setLoading(true);
        try {
            // Course
            const cRes = await api.get(`/courses/${id}`);
            const c = cRes.data.data;
            setCourse(c);
            setTitle(c.title);

            // Article linked to this course
            const aRes = await api.get('/articles');
            const linked = aRes.data.data.find(a => String(a.course_id) === String(id));
            setArticle(linked || null);
            if (linked) setIsRead(!!linked.is_read);

            if (isStudent) {
                // Enrollment status
                const eRes = await api.get(`/enrollments/student/${user.student_id}`);
                const enr = eRes.data.data.find(e => String(e.course_id) === String(id));
                setEnrollment(enr || null);

                // Today's attendance
                const atRes = await api.get(`/attendance/student/${user.student_id}`);
                const todayAtt = atRes.data.data.find(a =>
                    String(a.course_id) === String(id) && a.date?.slice(0, 10) === todayStr
                );
                setAttendance(todayAtt || null);
                setAttended(!!todayAtt);
            }
        } catch {
            addToast('Failed to load course data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        load(); 
        return () => {
            clearInterval(timerRef.current);
            clearInterval(sessionRef.current);
        };
    }, [id]);

    /* ── Reading timer ─────────────────────────────────────── */
    const startReading = () => {
        if (attended) {
            addToast('You already have an attendance record for today.', 'error');
            return;
        }
        setReading(true);
        clearInterval(sessionRef.current); // stop global timer 🔥
        if (isRead) return; // already read, no timer needed
        setReadSecs(0);
        setTimeLeft(DEADLINE_SECONDS);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setReadSecs(s => s + 1);
            setTimeLeft(t => t - 1);
        }, 1000);
    };

    const stopReading = () => {
        setReading(false);
        clearInterval(timerRef.current);
    };

    /* ── Mark article as read → auto attendance ─────────────── */
    const handleMarkRead = async () => {
        if (!article) return;
        setMarking(true);
        try {
            // 1. Mark article as read
            await api.post(`/articles/${article.id}/read`);
            setIsRead(true);
            addToast('✅ Article marked as read!');

            // 2. Auto-mark attendance for today
            await markAttendance('present', 'Auto-marked after reading article');
            setReading(false);
        } catch (err) {
            addToast(err.response?.data?.message || 'Error', 'error');
        } finally {
            setMarking(false);
        }
    };

    /* ── Mark attendance (also called directly if no article) ── */
    const markAttendance = async (status = 'present', notes = 'Auto-marked after reading article') => {
        if (attended) return;
        setMarking(true);
        clearInterval(sessionRef.current);
        clearInterval(timerRef.current);
        try {
            const res = await api.post('/attendance', {
                student_id: user.student_id,
                course_id:  id,
                date:       todayStr,
                status:     status,
                notes:      notes,
            });
            setAttendance(res.data.data);
            setAttended(true);
            if (status === 'present') {
                addToast('🎉 Attendance marked — you are PRESENT today!', 'success');
            } else {
                addToast('❌ Time is up! You are marked ABSENT.', 'error');
            }
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to mark attendance', 'error');
        } finally {
            setMarking(false);
        }
    };

    /* ── Enroll ─────────────────────────────────────────────── */
    const handleEnroll = async () => {
        try {
            await api.post('/enrollments', { student_id: user.student_id, course_id: id });
            addToast('🎓 Enrolled successfully!');
            load();
        } catch (err) {
            addToast(err.response?.data?.message || 'Enrollment failed', 'error');
        }
    };

    /* ── Render helpers ─────────────────────────────────────── */
    const renderArticleContent = (content) =>
        (content || '').split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
            if (line.startsWith('# '))  return <h1 key={i}>{line.slice(2)}</h1>;
            if (!line.trim())           return <br key={i} />;
            return <p key={i}>{line}</p>;
        });

    const timerPct = Math.min((readSecs / READ_SECONDS) * 100, 100);
    const canMark  = isRead || readSecs >= READ_SECONDS;

    if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;
    if (!course)  return <div className="empty-state"><div className="empty-icon">❌</div><h3>Course not found</h3></div>;

    /* ── Steps for student ──────────────────────────────────── */
    // Step 1: Enrolled?   Step 2: Read article?   Step 3: Attended?
    const step = !enrollment ? 1 : (!isRead && article) ? 2 : !attended ? 3 : 4;

    return (
        <>
            {/* ── Back button ── */}
            <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }}
                onClick={() => navigate('/courses')}>
                ← Back to Courses
            </button>

            {/* ── Course Hero ── */}
            <div className="course-hero">
                <div className="course-hero-badge">{course.credits} SKS</div>
                <h1 className="course-hero-title">{course.title}</h1>
                <p className="course-hero-instructor">👨‍🏫 {course.instructor || 'Instructor TBD'}</p>
                {course.description && <p className="course-hero-desc">{course.description}</p>}

                {/* Admin: no flow indicators */}
                {isStudent && (
                    <div className="course-steps">
                        {[
                            { n: 1, label: 'Enroll',    done: !!enrollment },
                            { n: 2, label: 'Read Article', done: isRead || !article },
                            { n: 3, label: 'Attend',    done: attended },
                        ].map(s => (
                            <div key={s.n} className={`course-step ${s.done ? 'done' : step === s.n ? 'active' : ''}`}>
                                <div className="course-step-num">{s.done ? '✓' : s.n}</div>
                                <span>{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isStudent && (
                <div className="course-action-grid">
                    {/* ── Panel 1: Enrollment ── */}
                    <div className={`action-panel ${enrollment ? 'panel-done' : 'panel-active'}`}>
                        <div className="action-panel-icon">🎓</div>
                        <h3>Enrollment</h3>
                        {enrollment ? (
                            <p>You are <strong>enrolled</strong> in this course.
                                <span className={`badge badge-${enrollment.status}`} style={{ marginLeft: 8 }}>
                                    {enrollment.status}
                                </span>
                            </p>
                        ) : (
                            <>
                                <p>You are not enrolled yet. Enroll to access the article and attendance.</p>
                                <button className="btn btn-primary" onClick={handleEnroll}>🎓 Enroll Now</button>
                            </>
                        )}
                    </div>

                    {/* ── Panel 2: Article ── */}
                    <div className={`action-panel ${!enrollment ? 'panel-locked' : isRead || !article ? 'panel-done' : 'panel-active'}`}>
                        <div className="action-panel-icon">📰</div>
                        <h3>Course Article</h3>
                        {!enrollment ? (
                            <p className="locked-msg">🔒 Enroll first to access the article.</p>
                        ) : !article ? (
                            <p>No article required for this course.</p>
                        ) : isRead ? (
                            <p>✅ You have <strong>read</strong> this article. Great job!</p>
                        ) : (
                            <>
                                <p><strong>{article.title}</strong></p>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Read the article below to unlock attendance for today.
                                </p>
                                {!attended && !reading && (
                                    <p style={{ color: sessionTime <= 10 ? '#ef4444' : 'var(--text-muted)', fontWeight: sessionTime <= 10 ? 700 : 400, fontSize: 13, marginBottom: 8 }}>
                                        ⏳ You must start reading in: {sessionTime}s
                                    </p>
                                )}
                                <button className="btn btn-primary" onClick={startReading} disabled={sessionTime <= 0}>📖 Read Article</button>
                            </>
                        )}
                    </div>

                    {/* ── Panel 3: Attendance ── */}
                    <div className={`action-panel ${attended ? 'panel-done' : (!enrollment || (!isRead && article)) ? 'panel-locked' : 'panel-active'}`}>
                        <div className="action-panel-icon">{attendance?.status === 'absent' ? '❌' : '✅'}</div>
                        <h3>Today's Attendance</h3>
                        {attended ? (
                            <div className="attendance-success">
                                <div className="attendance-success-badge" style={{ background: attendance?.status === 'absent' ? '#ef4444' : '#10b981' }}>
                                    {attendance?.status?.toUpperCase()}
                                </div>
                                <p>Attendance recorded for <strong>{todayStr}</strong></p>
                                {attendance?.status === 'absent' && <p style={{ fontSize: 13, color: '#ef4444' }}>{attendance.notes}</p>}
                            </div>
                        ) : (!enrollment || (!isRead && article)) ? (
                            <p className="locked-msg">🔒 Complete the steps above first.</p>
                        ) : (
                            <>
                                <p>You've completed all requirements. Mark your attendance for today!</p>
                                <button className="btn btn-primary" disabled={marking} onClick={() => markAttendance('present')}>
                                    {marking ? 'Marking…' : '✅ Mark Hadir'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Article Reader (full-width below panels) ── */}
            {reading && article && (
                <div className="article-reader-inline">
                    <div className="article-reader-header">
                        <h2>📰 {article.title}</h2>
                        <button className="btn btn-secondary btn-sm" onClick={stopReading}>✕ Close</button>
                    </div>

                    {/* Progress bar */}
                    {!isRead && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                <span style={{ color: canMark ? '#10b981' : 'var(--text-muted)' }}>
                                    {canMark ? '✅ You can now mark this article as read!' : `Read for ${READ_SECONDS - readSecs} more seconds…`}
                                </span>
                                <span style={{ color: timeLeft <= 10 ? '#ef4444' : 'var(--text-muted)', fontWeight: timeLeft <= 10 ? 700 : 400 }}>
                                    ⏳ Time left: {timeLeft}s
                                </span>
                            </div>
                            <div className="read-timer-bar">
                                <div className="read-timer-fill" style={{ width: `${timerPct}%`, background: canMark ? '#10b981' : 'var(--primary)' }} />
                            </div>
                        </div>
                    )}

                    <div className="article-content" style={{ marginBottom: 24 }}>
                        {renderArticleContent(article.content)}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-secondary" onClick={stopReading}>Close</button>
                        {isRead ? (
                            <button className="btn btn-primary" disabled>✅ Already Read</button>
                        ) : (
                            <button className="btn btn-primary" disabled={!canMark || marking} onClick={handleMarkRead}>
                                {marking ? 'Processing…' : canMark ? '✅ Mark as Read & Record Attendance' : `Wait ${READ_SECONDS - readSecs}s…`}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Admin view: basic info only */}
            {isAdmin && article && (
                <div className="article-reader-inline" style={{ marginTop: 24 }}>
                    <div className="article-reader-header">
                        <h2>📰 Linked Article: {article.title}</h2>
                    </div>
                    <div className="article-content">{renderArticleContent(article.content)}</div>
                </div>
            )}

            <ToastContainer toasts={toasts} />
        </>
    );
}
