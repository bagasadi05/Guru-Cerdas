import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon, CheckIcon, SearchIcon, XCircleIcon } from '../Icons';

export interface ComboboxOption {
    value: string;
    label: string;
    description?: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    error?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    className = '',
    disabled = false,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Find selected option object
    const selectedOption = useMemo(() =>
        options.find(opt => opt.value === value),
        [options, value]);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerTerm = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerTerm) ||
            (opt.description && opt.description.toLowerCase().includes(lowerTerm))
        );
    }, [options, searchTerm]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus input when opened
            setTimeout(() => inputRef.current?.focus(), 50);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <div className={`w-full ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-bold text-indigo-200 tracking-wide uppercase mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Trigger Button */}
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`
                        relative w-full cursor-pointer rounded-xl border bg-white/5 py-3 pl-4 pr-10 text-left shadow-sm transition-all duration-200
                        ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10 hover:border-indigo-500/50 focus:border-indigo-500'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}
                    `}
                >
                    <span className={`block truncate ${!selectedOption ? 'text-white/30' : 'text-white'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDownIcon className={`h-5 w-5 text-indigo-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </span>
                    {selectedOption && !disabled && (
                        <span
                            className="absolute inset-y-0 right-8 flex items-center pr-2 cursor-pointer hover:text-red-400 text-white/30 transition-colors"
                            onClick={handleClear}
                        >
                            <XCircleIcon className="h-5 w-5" />
                        </span>
                    )}
                </div>

                {/* Dropdown Panel */}
                {isOpen && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl bg-[#1a1f3c] border border-white/10 shadow-2xl ring-1 ring-black ring-opacity-5 backdrop-blur-xl animate-fade-in-up">
                        {/* Search Input */}
                        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#1a1f3c]/95 p-2 backdrop-blur-md">
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className="w-full rounded-lg border-0 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Cari..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <ul
                            ref={listRef}
                            className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm custom-scrollbar"
                        >
                            {filteredOptions.length === 0 ? (
                                <li className="relative cursor-default select-none py-4 px-4 text-center text-white/50 italic">
                                    Tidak ada hasil ditemukan.
                                </li>
                            ) : (
                                filteredOptions.map((option) => (
                                    <li
                                        key={option.value}
                                        className={`
                                            relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors duration-150
                                            ${option.value === value ? 'bg-indigo-600/30 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                                        `}
                                        onClick={() => handleSelect(option.value)}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'}`}>
                                                {option.label}
                                            </span>
                                            {option.description && (
                                                <span className={`block truncate text-xs mt-0.5 ${option.value === value ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                    {option.description}
                                                </span>
                                            )}
                                        </div>
                                        {option.value === value ? (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-400">
                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
};
