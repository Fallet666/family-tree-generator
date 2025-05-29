import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyLog } from '../../hooks/useFamilyLog';

export const LogPage: FC = () => {
    const { log, resetLog, error } = useFamilyLog();
    const navigate = useNavigate();

    return (
        <div style={{ padding: '2rem' }}>
            <h2>История изменений</h2>

            {error ? (
                <p style={{ color: 'red' }}>Ошибка загрузки логов</p>
            ) : log.length === 0 ? (
                <p>Пока нет записей</p>
            ) : (
                <ul>
                    {log.map((entry, index) => (
                        <li key={index} style={{ marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                            {entry}
                        </li>
                    ))}
                </ul>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button onClick={resetLog}>Очистить журнал</button>
                <button onClick={() => navigate('/tree')}>Назад к схеме</button>
            </div>
        </div>
    );
};
