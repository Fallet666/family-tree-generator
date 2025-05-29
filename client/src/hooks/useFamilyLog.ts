import { useEffect, useState } from 'react';

export function useFamilyLog() {
    const [log, setLog] = useState<string[]>([]);
    const [error, setError] = useState(false);

    const loadLogs = async () => {
        try {
            const res = await fetch('/api/logs');
            if (!res.ok) throw new Error('Failed to fetch logs');
            const data = await res.json();
            setLog(Array.isArray(data) ? data : []);
            setError(false);
        } catch {
            setLog([]);
            setError(true);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const resetLog = async () => {
        try {
            const res = await fetch('/api/logs', { method: 'DELETE' });
            if (res.ok) {
                await loadLogs();
            }
        } catch (e) {
            console.error('Ошибка очистки логов:', e);
        }
    };

    return { log, resetLog, error };
}
