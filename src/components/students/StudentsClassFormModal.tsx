import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface StudentsClassFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  classNameInput: string;
  onClassNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}

export const StudentsClassFormModal: React.FC<StudentsClassFormModalProps> = ({
  isOpen,
  mode,
  classNameInput,
  onClassNameChange,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Tambah Kelas Baru' : 'Edit Kelas'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="class-name">Nama Kelas</label>
          <Input
            id="class-name"
            value={classNameInput}
            onChange={(event) => onClassNameChange(event.target.value)}
            required
            placeholder="cth. 7A"
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
