// ============================================
// EXAMPLE: Task Form with Real-Time Validation
// This demonstrates how to use the new validation system
// ============================================

import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ValidatedInput, ValidatedTextarea, ValidatedSelect } from '../ui/ValidatedInput';
import useFormValidation, { ValidationRules } from '../../hooks/useFormValidation';
import { CheckSquareIcon } from '../Icons';

// Form data type
type TaskFormData = {
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    assignee: string;
};

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TaskFormData) => Promise<void>;
    initialData?: Partial<TaskFormData>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData
}) => {
    // Initialize form validation
    const {
        formState,
        handleChange,
        handleBlur,
        handleSubmit,
        reset,
        isSubmitting,
        values
    } = useFormValidation<TaskFormData>(
        {
            title: initialData?.title || '',
            description: initialData?.description || '',
            dueDate: initialData?.dueDate || '',
            priority: initialData?.priority || 'medium',
            assignee: initialData?.assignee || ''
        },
        {
            // Validation rules for each field
            title: {
                ...ValidationRules.required('Judul tugas wajib diisi'),
                ...ValidationRules.minLength(3, 'Judul minimal 3 karakter'),
                ...ValidationRules.maxLength(100, 'Judul maksimal 100 karakter')
            },
            description: {
                ...ValidationRules.maxLength(500, 'Deskripsi maksimal 500 karakter')
            },
            dueDate: {
                validate: (value) => {
                    if (!value) return true; // Optional field
                    const selectedDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (selectedDate < today) {
                        return 'Tanggal tidak boleh di masa lalu';
                    }
                    return true;
                }
            },
            priority: ValidationRules.required('Prioritas wajib dipilih'),
            assignee: {
                ...ValidationRules.minLength(2, 'Nama minimal 2 karakter'),
                // Example of async validation
                custom: async (value) => {
                    if (!value) return true; // Optional field

                    // Simulate API call to check if user exists
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Mock validation - replace with actual API call
                    const validUsers = ['John Doe', 'Jane Smith', 'Bob Johnson'];
                    const isValid = validUsers.some(user =>
                        user.toLowerCase().includes(value.toLowerCase())
                    );

                    return isValid || 'Pengguna tidak ditemukan';
                }
            }
        },
        {
            validateOnChange: true,
            validateOnBlur: true,
            debounceMs: 300
        }
    );

    // Handle form submission
    const onFormSubmit = handleSubmit(async (data) => {
        try {
            await onSubmit(data);
            reset();
            onClose();
        } catch (error) {
            console.error('Form submission error:', error);
        }
    });

    // Handle cancel
    const handleCancel = () => {
        reset();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            title={initialData ? 'Edit Tugas' : 'Tambah Tugas Baru'}
            icon={<CheckSquareIcon className="w-5 h-5" />}
        >
            <form onSubmit={onFormSubmit} className="space-y-5">
                {/* Title Input with Real-Time Validation */}
                <ValidatedInput
                    label="Judul Tugas"
                    id="task-title"
                    value={formState.title.value}
                    error={formState.title.error}
                    isValid={formState.title.isValid}
                    onChange={handleChange('title')}
                    onBlur={handleBlur('title')}
                    placeholder="Masukkan judul tugas"
                    required
                    helperText="Berikan judul yang jelas dan deskriptif"
                />

                {/* Description Textarea with Character Count */}
                <ValidatedTextarea
                    label="Deskripsi"
                    id="task-description"
                    value={formState.description.value}
                    error={formState.description.error}
                    isValid={formState.description.isValid}
                    onChange={handleChange('description')}
                    onBlur={handleBlur('description')}
                    placeholder="Jelaskan detail tugas (opsional)"
                    rows={4}
                    maxLength={500}
                    showCharCount
                />

                {/* Form Row with Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Due Date Input */}
                    <ValidatedInput
                        type="date"
                        label="Tenggat Waktu"
                        id="task-due-date"
                        value={formState.dueDate.value}
                        error={formState.dueDate.error}
                        isValid={formState.dueDate.isValid}
                        onChange={handleChange('dueDate')}
                        onBlur={handleBlur('dueDate')}
                        helperText="Kosongkan jika tidak ada deadline"
                    />

                    {/* Priority Select */}
                    <ValidatedSelect
                        label="Prioritas"
                        id="task-priority"
                        value={formState.priority.value}
                        error={formState.priority.error}
                        isValid={formState.priority.isValid}
                        onChange={handleChange('priority')}
                        onBlur={handleBlur('priority')}
                        required
                        options={[
                            { value: 'low', label: 'Rendah' },
                            { value: 'medium', label: 'Sedang' },
                            { value: 'high', label: 'Tinggi' }
                        ]}
                    />
                </div>

                {/* Assignee Input with Async Validation */}
                <ValidatedInput
                    label="Ditugaskan Kepada"
                    id="task-assignee"
                    value={formState.assignee.value}
                    error={formState.assignee.error}
                    isValid={formState.assignee.isValid}
                    isValidating={formState.assignee.validating}
                    onChange={handleChange('assignee')}
                    onBlur={handleBlur('assignee')}
                    placeholder="Cari nama pengguna"
                    helperText="Sistem akan mengecek apakah pengguna terdaftar"
                />

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="min-w-[120px]"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="mr-2">Menyimpan...</span>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </>
                        ) : (
                            initialData ? 'Simpan Perubahan' : 'Tambah Tugas'
                        )}
                    </Button>
                </div>

                {/* Form Status Summary */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                    {Object.values(formState).some(field => field.validating) && (
                        <span className="text-blue-600 dark:text-blue-400">
                            🔄 Memvalidasi...
                        </span>
                    )}
                    {Object.values(formState).every(field => field.isValid) &&
                        Object.values(formState).some(field => field.touched) && (
                            <span className="text-green-600 dark:text-green-400">
                                ✓ Formulir valid, siap disimpan
                            </span>
                        )}
                    {Object.values(formState).some(field => field.error) && (
                        <span className="text-red-600 dark:text-red-400">
                            ✗ Perbaiki kesalahan di atas
                        </span>
                    )}
                </div>
            </form>
        </Modal>
    );
};

// ============================================
// USAGE EXAMPLE IN A PAGE
// ============================================

/*
import { TaskFormModal } from './examples/ValidatedFormExample';

function MyPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const handleSubmit = async (data: TaskFormData) => {
        // Call your API
        await api.createTask(data);
        toast.success('Tugas berhasil dibuat!');
    };
    
    return (
        <div>
            <Button onClick={() => setIsModalOpen(true)}>
                Tambah Tugas
            </Button>
            
            <TaskFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
*/
