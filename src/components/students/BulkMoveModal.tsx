import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ClassRow } from './types';
import { ArrowRightIcon } from '../Icons';

interface BulkMoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAttributesConfirm: (targetClassId: string) => void;
    classes: ClassRow[];
    studentCount: number;
    currentClassId: string;
    isMoving: boolean;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({
    isOpen,
    onClose,
    onAttributesConfirm,
    classes,
    studentCount,
    currentClassId,
    isMoving
}) => {
    const [targetClassId, setTargetClassId] = useState<string>('');

    const handleConfirm = () => {
        if (!targetClassId) return;
        onAttributesConfirm(targetClassId);
    };

    // Filter out current class
    const availableClasses = classes.filter(c => c.id !== currentClassId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pindah Kelas Massal"
            icon={<ArrowRightIcon className="w-5 h-5" />}
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    Pindahkan <strong>{studentCount}</strong> siswa terpilih ke kelas lain.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Pilih Kelas Tujuan
                    </label>
                    <Select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full"
                    >
                        <option value="">-- Pilih Kelas --</option>
                        {availableClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isMoving}>Batal</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!targetClassId || isMoving}
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                        {isMoving ? 'Memindahkan...' : 'Pindahkan Siswa'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
