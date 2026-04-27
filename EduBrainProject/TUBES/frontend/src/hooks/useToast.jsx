import { useState, useCallback } from 'react';

let id = 0;

export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const current = ++id;
        setToasts(t => [...t, { id: current, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== current)), 3000);
    }, []);

    return { toasts, addToast };
}

export function ToastContainer({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <span>{t.type === 'success' ? '✅' : '❌'}</span>
                    {t.message}
                </div>
            ))}
        </div>
    );
}
