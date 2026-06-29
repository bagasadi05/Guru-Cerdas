import React from 'react';

interface FormInputWrapperProps {
    children: React.ReactNode;
    label: string;
    icon: React.FC<{ className?: string }>;
}

export const FormInputWrapper: React.FC<FormInputWrapperProps> = ({ children, label, icon: Icon }) => (
    <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">{label}</label>
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="h-5 w-5 text-slate-400 dark:text-gray-400" />
            </div>
            {children}
        </div>
    </div>
);
