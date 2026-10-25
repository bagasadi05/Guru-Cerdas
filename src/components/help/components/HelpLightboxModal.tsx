import React from 'react';
import { X } from 'lucide-react';

interface HelpLightboxModalProps {
    imageUrl: string | null;
    onClose: () => void;
}

export const HelpLightboxModal: React.FC<HelpLightboxModalProps> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
            >
                <X className="w-8 h-8" />
            </button>
            <img
                src={imageUrl}
                alt="Panduan diperbesar"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-50 duration-300"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};
