import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, FileText, Trash2, Loader2, Paperclip } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { Textarea } from '../../ui/Textarea';
import { journalSchema, JournalFormValues } from './schemas';
import { useCreateJournal, useUpdateJournal } from '../../../hooks/useTeachingJournals';
import journalService from '../../../services/journalService';
import type { TeachingJournal } from '../../../types/teachingJournal';
import { MarkdownToolbar } from '../../ui/MarkdownToolbar';
import { SUBJECTS } from '../../../constants/subjects';

interface ClassOption {
  id: string;
  name: string;
}

interface JournalFormProps {
  isOpen: boolean;
  onClose: () => void;
  journal?: TeachingJournal | null;
  classes: ClassOption[];
  prefillValues?: {
    class_id?: string;
    subject?: string;
    date?: string;
    schedule_id?: string;
  };
}

export const JournalForm: React.FC<JournalFormProps> = ({
  isOpen,
  onClose,
  journal,
  classes,
  prefillValues,
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const isEdit = !!journal;

  const getFileNameFromUrl = (url: string) => {
    if (!url) return '';
    try {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      const decoded = decodeURIComponent(lastPart);
      return decoded.split('-').slice(1).join('-') || decoded;
    } catch {
      return 'Lampiran';
    }
  };

  // Determine initial values
  const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local

  const getInitialValues = React.useCallback((): JournalFormValues => {
    if (journal) {
      return {
        class_id: journal.class_id || '',
        subject: journal.subject || '',
        date: journal.date || todayStr,
        meeting_number: journal.meeting_number ?? null,
        topic: journal.topic || '',
        objectives: journal.objectives || '',
        activities: journal.activities || '',
        notes: journal.notes || '',
        attachment_url: journal.attachment_url || '',
      };
    }

    return {
      class_id: prefillValues?.class_id || '',
      subject: prefillValues?.subject || '',
      date: prefillValues?.date || todayStr,
      meeting_number: null,
      topic: '',
      objectives: '',
      activities: '',
      notes: '',
      attachment_url: '',
    };
  }, [journal, prefillValues, todayStr]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: getInitialValues(),
  });

  // Reset form when modal opens or journal/prefill changes
  useEffect(() => {
    if (isOpen) {
      const initVals = getInitialValues();
      reset(initVals);
      if (initVals.attachment_url) {
        setUploadedFileName(getFileNameFromUrl(initVals.attachment_url));
      } else {
        setUploadedFileName('');
      }
    }
  }, [isOpen, getInitialValues, reset]);

  const activitiesRef = React.useRef<HTMLTextAreaElement | null>(null);
  const notesRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { ref: activitiesRegisterRef, ...activitiesRegisterProps } = register('activities');
  const { ref: notesRegisterRef, ...notesRegisterProps } = register('notes');

  const handleClose = () => {
    reset();
    setUploadedFileName('');
    onClose();
  };

  const createJournal = useCreateJournal(handleClose);
  const updateJournal = useUpdateJournal(handleClose);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const res = await journalService.uploadAttachment(user.id, file);
      setValue('attachment_url', res.publicUrl, { shouldValidate: true });
      setUploadedFileName(file.name);
      toast.success('Lampiran berhasil diunggah!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah lampiran';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async () => {
    const currentUrl = getValues('attachment_url');
    if (!currentUrl) return;

    setIsRemoving(true);
    try {
      await journalService.removeAttachment(currentUrl);
      setValue('attachment_url', '', { shouldValidate: true });
      setUploadedFileName('');
      toast.success('Lampiran berhasil dihapus');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus lampiran';
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const onSubmit = (data: JournalFormValues) => {
    const payload = {
      ...data,
      schedule_id: prefillValues?.schedule_id || journal?.schedule_id || null,
    };

    if (isEdit && journal) {
      updateJournal.mutate({ id: journal.id, payload });
    } else {
      createJournal.mutate(payload);
    }
  };

  const isPending = createJournal.isPending || updateJournal.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Jurnal Mengajar' : 'Tambah Jurnal Mengajar'}
      icon={<FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kelas <span className="text-rose-500">*</span>
            </label>
            <Controller
              name="class_id"
              control={control}
              render={({ field }) => (
                <div>
                  <CustomDropdown
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="-- Pilih Kelas --"
                    options={classes.map((c) => ({ value: c.id, label: c.name }))}
                    className={errors.class_id ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                  />
                  {errors.class_id && (
                    <p className="mt-1 text-xs text-rose-500">{errors.class_id.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <div>
                  <CustomDropdown
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="-- Pilih Mapel --"
                    options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                    className={errors.subject ? 'border-rose-500 ring-1 ring-rose-500' : ''}
                  />
                  {errors.subject && (
                    <p className="mt-1 text-xs text-rose-500">{errors.subject.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              {...register('date')}
              error={errors.date?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pertemuan Ke (Opsional)
            </label>
            <Input
              type="number"
              min="1"
              placeholder="cth. 1, 2, 3"
              {...register('meeting_number', {
                setValueAs: (v) => (v === '' ? null : Number(v)),
              })}
              error={errors.meeting_number?.message}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Topik Pembahasan <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="cth. Pola Bilangan, Tenses Review"
            {...register('topic')}
            error={errors.topic?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tujuan Pembelajaran (Opsional)
          </label>
          <Textarea
            rows={2}
            placeholder="Siswa dapat memahami dan memecahkan..."
            {...register('objectives')}
          />
          {errors.objectives?.message && (
            <p className="text-rose-500 text-xs mt-1">{errors.objectives.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Aktivitas Kegiatan Pembelajaran (Opsional)
          </label>
          <div className="flex flex-col">
            <MarkdownToolbar 
              textareaRef={activitiesRef}
              onChange={(val) => setValue('activities', val, { shouldValidate: true })}
            />
            <Textarea
              rows={3}
              placeholder="Menjelaskan konsep, diskusi kelompok, latihan soal..."
              {...activitiesRegisterProps}
              ref={(e) => {
                activitiesRegisterRef(e);
                activitiesRef.current = e as unknown as HTMLTextAreaElement;
              }}
              className="rounded-t-none focus:ring-0 focus:border-t-0 border-t-0"
            />
          </div>
          {errors.activities?.message && (
            <p className="text-rose-500 text-xs mt-1">{errors.activities.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Catatan Kejadian Khusus (Opsional)
          </label>
          <div className="flex flex-col">
            <MarkdownToolbar 
              textareaRef={notesRef}
              onChange={(val) => setValue('notes', val, { shouldValidate: true })}
            />
            <Textarea
              rows={2}
              placeholder="cth. Siswa A terlambat masuk kelas, listrik padam 10 menit..."
              {...notesRegisterProps}
              ref={(e) => {
                notesRegisterRef(e);
                notesRef.current = e as unknown as HTMLTextAreaElement;
              }}
              className="rounded-t-none focus:ring-0 focus:border-t-0 border-t-0"
            />
          </div>
          {errors.notes?.message && (
            <p className="text-rose-500 text-xs mt-1">{errors.notes.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Dokumen Lampiran (Opsional)
          </label>
          {getValues('attachment_url') ? (
            <div className="flex items-center justify-between p-3 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate">
                  {uploadedFileName || 'File Lampiran'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getValues('attachment_url') || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 px-2 py-1"
                >
                  Lihat
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                  onClick={handleRemoveAttachment}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
              <div className="flex flex-col items-center justify-center py-4">
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 mb-1 text-emerald-500 animate-spin" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mengunggah file...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-1 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Klik untuk mengunggah lampiran
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      PDF, JPG, PNG, DOC (maks. 5MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/70 dark:border-slate-700/60">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending || isUploading || isRemoving}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending || isUploading || isRemoving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Jurnal'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
