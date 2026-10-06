import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Loader2, Download } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DownloadMenuItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Hidden from `sm` upwards, where the same action has its own toolbar button. */
  mobileOnly?: boolean;
  separatorBefore?: boolean;
}

interface DownloadMenuProps {
  items: DownloadMenuItem[];
  /** Nothing to export yet. */
  disabled?: boolean;
  /** An export is running; the trigger shows a spinner and items are locked. */
  busy?: boolean;
  label?: string;
  tone?: 'light' | 'dark';
}

/**
 * Single primary action for everything that leaves the app (PDF, Word, print).
 * Keyboard: Enter/Space/ArrowDown opens, arrows move, Escape closes and returns focus.
 */
export const DownloadMenu: React.FC<DownloadMenuProps> = ({
  items,
  disabled = false,
  busy = false,
  label = 'Unduh',
  tone = 'light',
}) => {
  const [openRequested, setOpen] = useState(false);
  // A running export closes the menu without a state sync inside an effect.
  const open = openRequested && !busy;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const isDark = tone === 'dark';

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);

  const moveFocus = (direction: 1 | -1 | 'first' | 'last') => {
    const entries = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    ).filter((element) => !element.disabled && getComputedStyle(element).display !== 'none');
    if (entries.length === 0) return;
    const current = entries.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? entries.length - 1
          : (current + direction + entries.length) % entries.length;
    entries[nextIndex].focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus('first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus('last');
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy}
        className="h-9 px-3 sm:px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 duration-150"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">{busy ? 'Memproses…' : label}</span>
        {!busy && (
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border shadow-xl z-40 py-1.5 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                {item.separatorBefore && (
                  <div
                    role="separator"
                    className={`my-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'} ${
                      item.mobileOnly ? 'sm:hidden' : ''
                    }`}
                  />
                )}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={`w-full min-h-11 px-3 py-2 flex items-start gap-3 text-left text-sm cursor-pointer transition-colors ${
                    isDark
                      ? 'hover:bg-slate-700 focus:bg-slate-700'
                      : 'hover:bg-slate-50 focus:bg-slate-50 dark:hover:bg-slate-800 dark:focus:bg-slate-800'
                  } ${item.mobileOnly ? 'sm:hidden' : ''}`}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="font-semibold leading-tight">{item.label}</span>
                    {item.description && (
                      <span
                        className={`text-xs mt-0.5 leading-snug ${
                          isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
