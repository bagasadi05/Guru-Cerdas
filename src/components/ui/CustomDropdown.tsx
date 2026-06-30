import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '../Icons';

export interface CustomDropdownOption {
    value: string;
    label: string;
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: CustomDropdownOption[];
    placeholder?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = '-- Pilih --',
    id,
    className = '',
    disabled = false,
    icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 ${icon ? 'pl-10 pr-4' : 'px-4'} text-left text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                {icon && (
                    <div className="absolute left-3 flex items-center justify-center pointer-events-none">
                        {icon}
                    </div>
                )}
                <span className={`block truncate ${!selectedOption ? 'text-slate-400 dark:text-white/50' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm custom-scrollbar">
                    {options.length === 0 ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                            Tidak ada pilihan
                        </div>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option.value}
                                className={`relative cursor-pointer select-none py-2.5 px-4 transition-colors ${
                                    value === option.value
                                        ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100 font-medium'
                                        : 'text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="block truncate">{option.label}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
