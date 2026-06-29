export const daysOfWeek: string[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getColorForSubject(subject?: string): string {
    if (!subject) return 'border-l-slate-400';
    const colors = [
        'border-l-blue-500',
        'border-l-green-500',
        'border-l-purple-500',
        'border-l-amber-500',
        'border-l-rose-500',
        'border-l-cyan-500',
        'border-l-indigo-500',
        'border-l-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
        hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export function formatTime(time: string): string {
    if (!time) return '';
    const [h = '', m = ''] = time.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

export function formatTimeRange(start: string, end: string): string {
    return `${formatTime(start)} - ${formatTime(end)}`;
}
