import { createContext, useContext } from 'react';
import type { DashboardContextValue } from './dashboardTypes';

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within DashboardProvider');
    }
    return context;
}
