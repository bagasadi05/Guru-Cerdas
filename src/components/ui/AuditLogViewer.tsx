import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ClockIcon, UserIcon, EditIcon, PlusIcon, TrashIcon } from '../Icons';
import { AuditLog, getAuditLogs, getUserActivityLogs } from '../../services/gradeService';

interface AuditLogViewerProps {
    isOpen: boolean;
    onClose: () => void;
    tableName?: string;
    recordId?: string;
    title?: string;
    showUserLogs?: boolean;
}

/**
 * Component to view audit logs / changelog
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
    isOpen,
    onClose,
    tableName = 'academic_records',
    recordId,
    title = 'Riwayat Perubahan',
    showUserLogs = false,
}) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, tableName, recordId, showUserLogs]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = showUserLogs
                ? await getUserActivityLogs(50)
                : await getAuditLogs(tableName, recordId, 50);
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'INSERT':
                return <PlusIcon className="w-4 h-4 text-green-500" />;
            case 'UPDATE':
                return <EditIcon className="w-4 h-4 text-blue-500" />;
            case 'DELETE':
                return <TrashIcon className="w-4 h-4 text-red-500" />;
            default:
                return <ClockIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'INSERT':
                return 'Ditambahkan';
            case 'UPDATE':
                return 'Diubah';
            case 'DELETE':
                return 'Dihapus';
            default:
                return action;
        }
    };

    const getChanges = (log: AuditLog) => {
        if (log.action === 'INSERT') {
            return log.new_data;
        }
        if (log.action === 'DELETE') {
            return log.old_data;
        }
        if (log.action === 'UPDATE' && log.old_data && log.new_data) {
            const changes: Record<string, { old: unknown; new: unknown }> = {};
            Object.keys(log.new_data).forEach(key => {
                if (log.old_data && log.old_data[key] !== log.new_data![key]) {
                    changes[key] = {
                        old: log.old_data[key],
                        new: log.new_data![key],
                    };
                }
            });
            return changes;
        }
        return null;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Belum ada riwayat perubahan</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getActionIcon(log.action)}
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {getActionLabel(log.action)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(log.created_at)}
                                    </span>
                                </div>

                                {/* User info */}
                                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                    <UserIcon className="w-3 h-3" />
                                    <span>{log.user_email || 'Unknown user'}</span>
                                </div>

                                {/* Changes */}
                                {log.action === 'UPDATE' && (
                                    <div className="space-y-1">
                                        {Object.entries(getChanges(log) || {}).map(([key, value]) => (
                                            <div key={key} className="text-sm">
                                                <span className="text-gray-500">{key}: </span>
                                                <span className="text-red-500 line-through">
                                                    {String((value as any).old)}
                                                </span>
                                                <span className="mx-1">→</span>
                                                <span className="text-green-500">
                                                    {String((value as any).new)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {log.action === 'INSERT' && log.new_data && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {log.new_data.score && (
                                            <span>Nilai: <strong>{String(log.new_data.score)}</strong></span>
                                        )}
                                        {log.new_data.subject && (
                                            <span className="ml-2">({String(log.new_data.subject)})</span>
                                        )}
                                    </div>
                                )}

                                {log.action === 'DELETE' && log.old_data && (
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        Data dihapus: {log.old_data.score && `Nilai ${log.old_data.score}`}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>
                        Tutup
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Compact inline changelog badge
 */
export const ChangelogBadge: React.FC<{
    onClick: () => void;
    changeCount?: number;
}> = ({ onClick, changeCount }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-indigo-500 
                   bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
    >
        <ClockIcon className="w-3 h-3" />
        Riwayat
        {changeCount !== undefined && changeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-[10px]">
                {changeCount}
            </span>
        )}
    </button>
);

export default AuditLogViewer;
