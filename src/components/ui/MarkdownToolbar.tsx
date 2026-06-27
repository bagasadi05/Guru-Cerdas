import React from 'react';
import { Bold, Italic, List } from 'lucide-react';
import { Button } from './Button';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (value: string) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, onChange }) => {
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    // Restore selection after a small delay so React updates value first
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/50 border border-b-0 border-slate-300 dark:border-slate-700 rounded-t-xl transition-colors">
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        onClick={() => insertText('**', '**')}
        title="Tebal (Bold)"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        onClick={() => insertText('*', '*')}
        title="Miring (Italic)"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        onClick={() => insertText('- ')}
        title="Daftar (Bulleted List)"
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
};
