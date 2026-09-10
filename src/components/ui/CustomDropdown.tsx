import React, { useState, useRef, useEffect, useId } from 'react';
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
    menuClassName?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    'aria-label'?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = '-- Pilih --',
    id,
    className = '',
    menuClassName = '',
    disabled = false,
    icon,
    'aria-label': ariaLabel,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const generatedId = useId();
    const dropdownId = id || generatedId;

    const selectedIndex = options.findIndex(opt => opt.value === value);
    const selectedOption = options[selectedIndex];

    const openDropdown = () => {
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setIsOpen(true);
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            openDropdown();
        } else {
            setIsOpen(false);
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
            const items = listboxRef.current.querySelectorAll('[role="option"]');
            const target = items[highlightedIndex] as HTMLElement | undefined;
            if (target) {
                target.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen, highlightedIndex]);

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    openDropdown();
                } else {
                    setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) {
                    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : options.length - 1);
                    setIsOpen(true);
                } else {
                    setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
                }
                break;
            case 'Home':
                if (isOpen) {
                    e.preventDefault();
                    setHighlightedIndex(0);
                }
                break;
            case 'End':
                if (isOpen) {
                    e.preventDefault();
                    setHighlightedIndex(options.length - 1);
                }
                break;
            case 'Enter':
            case ' ':
                if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
                    e.preventDefault();
                    onChange(options[highlightedIndex].value);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                } else if (!isOpen) {
                    e.preventDefault();
                    openDropdown();
                }
                break;
            case 'Escape':
            case 'Tab':
                if (isOpen) {
                    setIsOpen(false);
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        buttonRef.current?.focus();
                    }
                }
                break;
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef} onKeyDown={handleKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                id={dropdownId}
                disabled={disabled}
                onClick={toggleDropdown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel || placeholder}
                aria-controls={`${dropdownId}-listbox`}
                className={`flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 ${icon ? 'pl-10 pr-4' : 'px-4'} text-left text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
                <div
                    ref={listboxRef}
                    id={`${dropdownId}-listbox`}
                    role="listbox"
                    tabIndex={-1}
                    aria-activedescendant={highlightedIndex >= 0 ? `${dropdownId}-option-${highlightedIndex}` : undefined}
                    className={`absolute z-50 mt-1 max-h-60 min-w-full w-max max-w-[calc(100vw-2rem)] overflow-auto rounded-xl bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm custom-scrollbar ${menuClassName}`}
                >
                    {options.length === 0 ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                            Tidak ada pilihan
                        </div>
                    ) : (
                        options.map((option, index) => {
                            const isSelected = value === option.value;
                            const isHighlighted = highlightedIndex === index;
                            return (
                                <div
                                    key={option.value}
                                    id={`${dropdownId}-option-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`relative cursor-pointer select-none py-2.5 px-4 transition-colors ${
                                        isSelected
                                            ? 'bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100 font-medium'
                                            : isHighlighted
                                                ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-white'
                                                : 'text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        buttonRef.current?.focus();
                                    }}
                                >
                                    <span className="block whitespace-nowrap">{option.label}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
