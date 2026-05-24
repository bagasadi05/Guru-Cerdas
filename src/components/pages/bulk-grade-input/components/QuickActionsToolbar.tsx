import React from 'react';
import { Button } from '../../../ui/Button';
import { TrashIcon } from '../../../Icons';

interface QuickActionsToolbarProps {
    kkm: number;
    onBulkFill: (value: number) => void;
    onFillAllWith: (value: number) => void;
    onClearAllClick: () => void;
}

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
    kkm,
    onBulkFill,
    onFillAllWith,
    onClearAllClick,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-fade-in">
            <span className="text-sm text-gray-500 mr-2">Quick Fill:</span>
            <Button size="sm" variant="outline" onClick={() => onBulkFill(100)}>
                Kosong → 100
            </Button>
            <Button size="sm" variant="outline" onClick={() => onBulkFill(kkm)}>
                Kosong → KKM ({kkm})
            </Button>
            <Button size="sm" variant="outline" onClick={() => onFillAllWith(100)}>
                Semua 100
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={onClearAllClick} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                <TrashIcon className="w-4 h-4 mr-1.5" />
                Clear All
            </Button>
        </div>
    );
};
