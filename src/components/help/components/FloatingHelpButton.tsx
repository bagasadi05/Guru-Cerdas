import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface FloatingHelpButtonProps {
    onClick: () => void;
}

export const FloatingHelpButton: React.FC<FloatingHelpButtonProps> = ({ onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-2xl shadow-brand-600/30 flex items-center justify-center hover:scale-110 transition-transform group cursor-pointer"
            aria-label="Buka Pusat Bantuan"
        >
            <HelpCircle className="w-7 h-7" />

            {/* Tooltip */}
            <div className="absolute right-full mr-3 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Butuh Bantuan?
            </div>

            {/* Pulse Animation */}
            <div className="absolute inset-0 rounded-full bg-brand-600 animate-ping opacity-20" />
        </button>
    );
};
