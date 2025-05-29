export async function addLogEntry(entry: string): Promise<void> {
    await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry })
    });
}

export async function getLogEntries(): Promise<string[]> {
    const res = await fetch('/api/logs');
    const data = await res.json();
    return data;
}

export async function clearLog(): Promise<void> {
    await fetch('/api/logs', { method: 'DELETE' });
}
