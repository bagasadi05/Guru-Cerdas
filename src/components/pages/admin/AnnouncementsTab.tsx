/**
 * Announcements Tab Component
 * Manages announcement creation, templates, and listing
 */
import React, { useState } from 'react';
import {
    Loader2,
    Megaphone,
    Plus,
    Trash2,
    Sparkles,
    Calendar,
    ClipboardCheck,
    FileText,
    Users,
    HeartPulse,
    Bus,
    GraduationCap,
    Trophy,
    CreditCard,
    Flag
} from 'lucide-react';
import { Announcement, AnnouncementTemplate, AnnouncementTemplateIcon } from './types';
import { announcementTemplates } from './constants';

export interface AnnouncementsTabProps {
    announcements: Announcement[];
    announcementsLoading: boolean;
    onCreateAnnouncement: (form: { title: string; content: string; audience_type: string }) => Promise<void>;
    onDeleteAnnouncement: (id: string) => void;
}

const audienceLabelMap: Record<string, string> = {
    all: 'Semua',
    teachers: 'Guru',
    parents: 'Orang Tua',
    students: 'Siswa',
};

const getAudienceLabel = (value?: string | null) => {
    if (!value) return 'Semua';
    return audienceLabelMap[value] || value;
};

// Icon mapping for templates - moved here to avoid JSX in .ts file
const getTemplateIcon = (icon: AnnouncementTemplateIcon): React.ReactNode => {
    const iconProps = { size: 20, className: "text-indigo-500" };
    switch (icon) {
        case 'calendar': return <Calendar {...iconProps} />;
        case 'clipboard-check': return <ClipboardCheck {...iconProps} />;
        case 'file-text': return <FileText {...iconProps} />;
        case 'users': return <Users {...iconProps} />;
        case 'heart-pulse': return <HeartPulse {...iconProps} />;
        case 'bus': return <Bus {...iconProps} />;
        case 'graduation-cap': return <GraduationCap {...iconProps} />;
        case 'trophy': return <Trophy {...iconProps} />;
        case 'credit-card': return <CreditCard {...iconProps} />;
        case 'flag': return <Flag {...iconProps} />;
        default: return <Megaphone {...iconProps} />;
    }
};

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
    announcements,
    announcementsLoading,
    onCreateAnnouncement,
    onDeleteAnnouncement,
}) => {
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        content: '',
        audience_type: 'all'
    });

    const applyTemplate = (template: AnnouncementTemplate) => {
        setAnnouncementForm({
            title: template.title,
            content: template.content,
            audience_type: template.audience_type,
        });
        setShowTemplates(false);
    };

    const handleSubmit = async () => {
        await onCreateAnnouncement(announcementForm);
        setAnnouncementForm({ title: '', content: '', audience_type: 'all' });
        setShowAnnouncementForm(false);
    };

    return (
        <div className="space-y-6">
            {/* Create Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
                >
                    <Plus size={18} />
                    Buat Pengumuman
                </button>
            </div>

            {/* Create Form */}
            {showAnnouncementForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Pengumuman Baru</h3>
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all"
                        >
                            <Sparkles size={14} />
                            Template
                        </button>
                    </div>

                    {/* Templates Modal/Dropdown */}
                    {showTemplates && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Pilih Template</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                                {announcementTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="group text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                                {getTemplateIcon(template.icon)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                                                    {template.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                    {template.content}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                        {template.category}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {getAudienceLabel(template.audience_type)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Judul pengumuman"
                            value={announcementForm.title}
                            onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                        />
                        <textarea
                            placeholder="Isi pengumuman..."
                            rows={4}
                            value={announcementForm.content}
                            onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none"
                        />
                        <select
                            value={announcementForm.audience_type}
                            onChange={(e) => setAnnouncementForm(prev => ({ ...prev, audience_type: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                        >
                            <option value="all">Semua</option>
                            <option value="teachers">Guru</option>
                            <option value="parents">Orang Tua</option>
                            <option value="students">Siswa</option>
                        </select>
                        <div className="flex gap-3">
                            <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                                Simpan
                            </button>
                            <button onClick={() => setShowAnnouncementForm(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl">
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {announcementsLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Megaphone size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Belum ada pengumuman</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {announcements.map(a => (
                            <div key={a.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{a.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.content}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{getAudienceLabel(a.audience_type)}</span>
                                            <span>{a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => onDeleteAnnouncement(a.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnnouncementsTab;
