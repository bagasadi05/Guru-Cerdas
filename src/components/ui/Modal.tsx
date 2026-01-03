import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, icon, maxWidth = 'max-w-lg' }) => {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent scrolling on body when modal is open
      document.body.style.overflow = 'hidden';

      // Focus the modal after a brief delay to ensure DOM is ready
      setTimeout(() => {
        const modalContainer = modalRef.current;
        if (modalContainer) {
          const focusableElements = modalContainer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      }, 100);
    }

    return () => {
      document.body.style.overflow = 'unset';

      // Restore focus to previously focused element
      if (previousActiveElement.current && !isOpen) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !modalRef.current) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Handle Tab key for focus trap
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // If shift+tab and we're on first element, go to last
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        // If tab and we're on last element, go to first
        else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} sm:mx-4 animate-fade-in-up modal-glow-border max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        id="modal-container"
      >
        <div className="relative overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border border-gray-200/20 dark:border-gray-700/50 flex flex-col max-h-[90vh] sm:max-h-[85vh]">
          {/* Decorative Header Gradient */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600 to-blue-500 opacity-10 dark:opacity-20 pointer-events-none" aria-hidden="true"></div>

          <div className="relative p-6 border-b border-gray-200/80 dark:border-gray-800/60">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {icon && (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg" aria-hidden="true">
                    {icon}
                  </div>
                )}
                <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6" role="document">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};