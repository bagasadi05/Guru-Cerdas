import React from 'react';

export const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    // Split by bold (**text**) and italic (*text*) markers
    // Note: This is a simple parser and might not handle nested complex markdown perfectly, 
    // but works for standard AI bold/italic outputs.
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    // Check if it's not actually bold (already handled)
                    return <em key={index} className="italic">{part.slice(1, -1)}</em>;
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};
