export interface DashboardWidget {
    id: string;
    type: string;
    title: string;
    size: 'sm' | 'md' | 'lg' | 'full';
    position: number;
    visible: boolean;
    settings?: Record<string, unknown>;
}

export interface DashboardContextValue {
    widgets: DashboardWidget[];
    addWidget: (widget: Omit<DashboardWidget, 'id' | 'position'>) => void;
    removeWidget: (id: string) => void;
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
    reorderWidgets: (fromIndex: number, toIndex: number) => void;
    toggleWidget: (id: string) => void;
    saveLayout: () => void;
    resetLayout: () => void;
}
