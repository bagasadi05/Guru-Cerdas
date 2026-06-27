import { useEffect } from 'react';

export function useWarnUnsavedChanges(isDirty: boolean, warningMessage: string = 'Ada perubahan yang belum disimpan. Yakin ingin keluar?') {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = warningMessage;
        return warningMessage;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, warningMessage]);
}
