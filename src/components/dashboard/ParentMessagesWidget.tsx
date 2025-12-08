import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquareIcon, UsersIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon, InboxIcon } from '../Icons';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface ParentMessageWithStudent {
    id: string;
    created_at: string;
    message: string;
    sender: 'teacher' | 'parent';
    is_read: boolean;
    student_id: string;
    student_name: string;
    student_avatar: string;
}

const ParentMessagesWidget: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['parentMessages', user?.id],
        queryFn: async (): Promise<{ messages: ParentMessageWithStudent[]; unreadCount: number }> => {
            // Fetch recent parent messages with student info
            const { data: communications, error } = await supabase
                .from('communications')
                .select(`
                    id,
                    created_at,
                    message,
                    sender,
                    is_read,
                    student_id,
                    students!inner(name, avatar_url)
                `)
                .eq('user_id', user!.id)
                .eq('sender', 'parent')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const messages: ParentMessageWithStudent[] = (communications || []).map((msg: any) => ({
                id: msg.id,
                created_at: msg.created_at,
                message: msg.message,
                sender: msg.sender,
                is_read: msg.is_read,
                student_id: msg.student_id,
                student_name: msg.students?.name || 'Unknown',
                student_avatar: msg.students?.avatar_url || '',
            }));

            // Count unread messages
            const { count } = await supabase
                .from('communications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user!.id)
                .eq('sender', 'parent')
                .eq('is_read', false);

            return { messages, unreadCount: count || 0 };
        },
        enabled: !!user,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays < 7) return `${diffDays} hari lalu`;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    const handleMessageClick = (studentId: string) => {
        navigate(`/siswa/${studentId}`, { state: { openTab: 'communication' } });
    };

    if (isLoading) {
        return (
            <div className="glass-card rounded-3xl p-0 overflow-hidden border border-slate-200/50 dark:border-white/5">
                <div className="p-6 border-b border-slate-200/50 dark:border-white/5">
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const { messages = [], unreadCount = 0 } = data || {};

    return (
        <div className="glass-card rounded-3xl p-0 overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/30 dark:shadow-black/20">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MessageSquareIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Pesan Orang Tua</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {unreadCount > 0 ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        {unreadCount} pesan belum dibaca
                                    </span>
                                ) : (
                                    'Semua pesan telah dibaca'
                                )}
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <span className="w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Messages List */}
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                            <InboxIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada pesan</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Pesan dari orang tua akan muncul di sini
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {messages.map((msg) => (
                            <li key={msg.id}>
                                <button
                                    onClick={() => handleMessageClick(msg.student_id)}
                                    className="w-full p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left group"
                                >
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {msg.student_avatar ? (
                                            <img
                                                src={msg.student_avatar}
                                                alt={msg.student_name}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                                                {msg.student_name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {!msg.is_read && (
                                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`text-sm font-semibold truncate ${!msg.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                Wali {msg.student_name}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                                                <ClockIcon className="w-3 h-3" />
                                                <span>{formatTime(msg.created_at)}</span>
                                            </div>
                                        </div>
                                        <p className={`text-sm line-clamp-2 ${!msg.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {msg.message}
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRightIcon className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            {messages.length > 0 && (
                <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <Link to="/siswa" className="block">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Lihat Semua Siswa
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default ParentMessagesWidget;
