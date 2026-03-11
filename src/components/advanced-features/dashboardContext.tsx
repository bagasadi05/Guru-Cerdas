import React, { useCallback, useEffect, useState } from 'react';
import { DashboardContext } from './dashboardShared';
import type { DashboardWidget } from './dashboardTypes';

const loadWidgetsFromStorage = (
    storageKey: string,
    defaultWidgets: Omit<DashboardWidget, 'position'>[]
): DashboardWidget[] => {
    if (typeof localStorage === 'undefined') {
        return defaultWidgets.map((widget, index) => ({ ...widget, position: index }));
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) {
        return defaultWidgets.map((widget, index) => ({ ...widget, position: index }));
    }

    try {
        return JSON.parse(stored) as DashboardWidget[];
    } catch {
        return defaultWidgets.map((widget, index) => ({ ...widget, position: index }));
    }
};

interface DashboardProviderProps {
    children: React.ReactNode;
    defaultWidgets: Omit<DashboardWidget, 'position'>[];
    storageKey?: string;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
    children,
    defaultWidgets,
    storageKey = 'dashboard_layout'
}) => {
    const [widgets, setWidgets] = useState<DashboardWidget[]>(() =>
        loadWidgetsFromStorage(storageKey, defaultWidgets)
    );

    const addWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'position'>) => {
        const newWidget: DashboardWidget = {
            ...widget,
            id: `widget_${Date.now()}`,
            position: widgets.length
        };
        setWidgets(previous => [...previous, newWidget]);
    }, [widgets.length]);

    const removeWidget = useCallback((id: string) => {
        setWidgets(previous => previous.filter(widget => widget.id !== id));
    }, []);

    const updateWidget = useCallback((id: string, updates: Partial<DashboardWidget>) => {
        setWidgets(previous => previous.map(widget => (
            widget.id === id ? { ...widget, ...updates } : widget
        )));
    }, []);

    const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
        setWidgets(previous => {
            const result = [...previous];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result.map((widget, index) => ({ ...widget, position: index }));
        });
    }, []);

    const toggleWidget = useCallback((id: string) => {
        setWidgets(previous => previous.map(widget => (
            widget.id === id ? { ...widget, visible: !widget.visible } : widget
        )));
    }, []);

    const saveLayout = useCallback(() => {
        localStorage.setItem(storageKey, JSON.stringify(widgets));
    }, [storageKey, widgets]);

    const resetLayout = useCallback(() => {
        setWidgets(defaultWidgets.map((widget, index) => ({ ...widget, position: index })));
        localStorage.removeItem(storageKey);
    }, [defaultWidgets, storageKey]);

    useEffect(() => {
        if (widgets.length > 0) {
            saveLayout();
        }
    }, [saveLayout, widgets]);

    return (
        <DashboardContext.Provider value={{
            widgets,
            addWidget,
            removeWidget,
            updateWidget,
            reorderWidgets,
            toggleWidget,
            saveLayout,
            resetLayout
        }}>
            {children}
        </DashboardContext.Provider>
    );
};
