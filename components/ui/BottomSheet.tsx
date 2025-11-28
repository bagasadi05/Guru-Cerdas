import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircleIcon } from '../Icons';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, title }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className={`
          absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
                onClick={onClose}
            />

            {/* Sheet Content */}
            <div
                className={`
          relative w-full max-w-lg bg-white dark:bg-gray-900 
          rounded-t-2xl sm:rounded-2xl shadow-xl 
          transform transition-transform duration-300 ease-out
          max-h-[90vh] flex flex-col
          ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95'}
        `}
            >
                {/* Handle bar for mobile feel */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title || 'Menu'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <XCircleIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BottomSheet;
