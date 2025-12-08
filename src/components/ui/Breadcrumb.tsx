import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '../Icons';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface BreadcrumbProps {
    items?: BreadcrumbItem[];
    className?: string;
}

// Route to label mapping
const routeLabels: Record<string, string> = {
    '': 'Beranda',
    'dashboard': 'Dashboard',
    'students': 'Siswa',
    'attendance': 'Absensi',
    'schedule': 'Jadwal',
    'tasks': 'Tugas',
    'settings': 'Pengaturan',
    'cetak-rapot': 'Cetak Rapor',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
    const location = useLocation();

    // Auto-generate breadcrumbs from path if items not provided
    const breadcrumbs = items || (() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const crumbs: BreadcrumbItem[] = [{ label: 'Beranda', path: '/dashboard' }];

        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath += `/${part}`;
            // Skip UUID-like segments (student IDs, etc)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
                crumbs.push({ label: 'Detail', path: undefined });
            } else {
                const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
                crumbs.push({
                    label,
                    path: index < pathParts.length - 1 ? currentPath : undefined
                });
            }
        });

        return crumbs;
    })();

    if (breadcrumbs.length <= 1) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 overflow-x-auto scrollbar-hide ${className}`}
        >
            {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <ChevronRightIcon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    )}
                    {crumb.path ? (
                        <Link
                            to={crumb.path}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 whitespace-nowrap"
                        >
                            {index === 0 && <HomeIcon className="w-4 h-4" />}
                            <span>{crumb.label}</span>
                        </Link>
                    ) : (
                        <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">
                            {crumb.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
