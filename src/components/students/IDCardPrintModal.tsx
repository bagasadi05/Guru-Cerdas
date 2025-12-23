import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PrinterIcon } from '../Icons';
import { IDCard } from './IDCard';
import { StudentRow, ClassRow } from './types';
import ReactToPrint from 'react-to-print';

interface IDCardPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentRow[];
    classes: ClassRow[];
}

export const IDCardPrintModal: React.FC<IDCardPrintModalProps> = ({ isOpen, onClose, students, classes }) => {
    const printRef = useRef<HTMLDivElement>(null);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Cetak Kartu Pelajar (${students.length} Siswa)`}
            maxWidth="max-w-4xl"
        >
            <div className="space-y-6">
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Batal</Button>
                    <ReactToPrint
                        trigger={() => (
                            <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                                <PrinterIcon className="w-4 h-4 mr-2" />
                                Cetak Kartu
                            </Button>
                        )}
                        content={() => printRef.current}
                        documentTitle="Kartu_Pelajar_Siswa"
                        pageStyle={`
                            @page { size: A4; margin: 10mm; }
                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                            }
                        `}
                    />
                </div>

                <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-xl overflow-y-auto max-h-[60vh] border border-gray-200 dark:border-gray-700">
                    <div ref={printRef} className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 w-full">
                        {students.map(student => {
                            const studentClass = classes.find(c => c.id === student.class_id)?.name;
                            return (
                                <div key={student.id} className="flex justify-center p-2 page-break-inside-avoid">
                                    <IDCard student={student} className={studentClass} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
