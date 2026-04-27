import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null);   // { id, name, email, role }
    const [token,   setToken]   = useState(() => localStorage.getItem('eb_token') || null);
    const [loading, setLoading] = useState(true);

    // Attach token to every axios request
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('eb_token', token);
        } else {
            delete api.defaults.headers.common['Authorization'];
            localStorage.removeItem('eb_token');
        }
    }, [token]);

    // Restore session on mount
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        api.get('/auth/me')
            .then(res => {
                const u = res.data.data;
                // student_id may be stored in token; re-decode or fetch from login
                const storedUser = JSON.parse(localStorage.getItem('eb_user') || 'null');
                setUser(storedUser || u);
            })
            .catch(() => { setToken(null); setUser(null); localStorage.removeItem('eb_user'); })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token: t, user: u } = res.data;
        setToken(t);
        setUser(u);
        localStorage.setItem('eb_user', JSON.stringify(u));
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        return u;
    };

    const register = async (data) => {
        const res = await api.post('/auth/register', data);
        const { token: t, user: u } = res.data;
        setToken(t);
        setUser(u);
        localStorage.setItem('eb_user', JSON.stringify(u));
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        return u;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('eb_user');
    };


    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === 'admin', isStudent: user?.role === 'student' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
