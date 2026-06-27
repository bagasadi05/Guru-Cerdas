import React from 'react';

export const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // First split by newline to handle multiline and bullets
    const lines = text.split('\n');

    return (
        <div className="space-y-1">
            {lines.map((line, lineIndex) => {
                const isBullet = line.trim().startsWith('- ');
                const content = isBullet ? line.trim().substring(2) : line;

                // Split by bold (**text**) and italic (*text*) markers
                const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);

                const renderedLine = (
                    <>
                        {parts.map((part, index) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={index} className="italic">{part.slice(1, -1)}</em>;
                            }
                            return <span key={index}>{part}</span>;
                        })}
                    </>
                );

                if (isBullet) {
                    return (
                        <div key={lineIndex} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                            <span>{renderedLine}</span>
                        </div>
                    );
                }

                return <div key={lineIndex}>{renderedLine}</div>;
            })}
        </div>
    );
};
