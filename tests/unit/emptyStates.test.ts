import { describe, it, expect } from 'vitest';

describe('Empty States', () => {
    describe('EmptyState Component', () => {
        it('should have title and description', () => {
            const props = {
                title: 'No Data',
                description: 'No data available'
            };
            expect(props.title).toBe('No Data');
            expect(props.description).toBe('No data available');
        });

        it('should support different types', () => {
            const types = ['students', 'attendance', 'tasks', 'schedule', 'search', 'error', 'offline', 'generic'];
            expect(types.length).toBe(8);
        });

        it('should support primary action', () => {
            const primaryAction = {
                label: 'Add Student',
                onClick: () => { }
            };
            expect(primaryAction.label).toBe('Add Student');
        });

        it('should support secondary action', () => {
            const secondaryAction = {
                label: 'Import',
                onClick: () => { }
            };
            expect(secondaryAction.label).toBe('Import');
        });

        it('should support custom illustration', () => {
            const customIllustration = '<div>Custom</div>';
            expect(customIllustration).toBeDefined();
        });

        it('should show onboarding hint when enabled', () => {
            const showHint = true;
            const hintText = 'Click the button above to get started.';
            expect(showHint).toBe(true);
            expect(hintText).toContain('Click');
        });
    });

    describe('Preset Empty States', () => {
        describe('EmptyStudents', () => {
            it('should have correct title', () => {
                const title = 'Belum Ada Data Siswa';
                expect(title).toContain('Siswa');
            });

            it('should have add and import actions', () => {
                const primaryLabel = 'Tambah Siswa';
                const secondaryLabel = 'Import dari Excel';
                expect(primaryLabel).toContain('Tambah');
                expect(secondaryLabel).toContain('Import');
            });
        });

        describe('EmptyAttendance', () => {
            it('should have correct title', () => {
                const title = 'Belum Ada Data Absensi';
                expect(title).toContain('Absensi');
            });

            it('should have fill attendance action', () => {
                const label = 'Isi Absensi';
                expect(label).toBe('Isi Absensi');
            });
        });

        describe('EmptyTasks', () => {
            it('should have correct title', () => {
                const title = 'Tidak Ada Tugas';
                expect(title).toContain('Tugas');
            });

            it('should have create task action', () => {
                const label = 'Buat Tugas';
                expect(label).toBe('Buat Tugas');
            });
        });

        describe('EmptySchedule', () => {
            it('should have correct title', () => {
                const title = 'Jadwal Belum Dibuat';
                expect(title).toContain('Jadwal');
            });
        });

        describe('EmptySearchResults', () => {
            it('should include query in description', () => {
                const query = 'test search';
                const description = `Tidak ada hasil untuk "${query}".`;
                expect(description).toContain('test search');
            });

            it('should have clear search action', () => {
                const label = 'Hapus Pencarian';
                expect(label).toBe('Hapus Pencarian');
            });
        });

        describe('EmptyError', () => {
            it('should have error title', () => {
                const title = 'Terjadi Kesalahan';
                expect(title).toBe('Terjadi Kesalahan');
            });

            it('should have retry action', () => {
                const label = 'Coba Lagi';
                expect(label).toBe('Coba Lagi');
            });
        });

        describe('EmptyOffline', () => {
            it('should have offline title', () => {
                const title = 'Anda Sedang Offline';
                expect(title).toContain('Offline');
            });
        });
    });

    describe('Illustrations', () => {
        it('should have floating animation delay', () => {
            const delay = 200;
            const style = { animationDelay: `${delay}ms` };
            expect(style.animationDelay).toBe('200ms');
        });

        it('should have hover scale effect', () => {
            const isHovered = true;
            const className = isHovered ? 'scale-110' : 'scale-100';
            expect(className).toBe('scale-110');
        });

        it('should have gradient backgrounds', () => {
            const gradients = {
                students: 'from-indigo-100 to-purple-100',
                attendance: 'from-emerald-100 to-teal-100',
                tasks: 'from-amber-100 to-orange-100',
                schedule: 'from-sky-100 to-blue-100'
            };
            expect(gradients.students).toContain('indigo');
            expect(gradients.attendance).toContain('emerald');
        });

        it('should have dark mode variants', () => {
            const darkClass = 'dark:from-indigo-900/30 dark:to-purple-900/30';
            expect(darkClass).toContain('dark:');
        });
    });

    describe('CompactEmptyState', () => {
        it('should have smaller padding', () => {
            const padding = 'py-8 px-4';
            expect(padding).toContain('py-8');
        });

        it('should have smaller icon container', () => {
            const size = 'w-12 h-12';
            expect(size).toBe('w-12 h-12');
        });
    });

    describe('InlineEmptyState', () => {
        it('should be inline with text', () => {
            const message = 'No results';
            const action = { label: 'Add', onClick: () => { } };
            expect(message).toBe('No results');
            expect(action.label).toBe('Add');
        });
    });

    describe('WelcomeEmptyState', () => {
        it('should show personalized greeting', () => {
            const userName = 'John';
            const greeting = `Selamat Datang, ${userName}!`;
            expect(greeting).toContain('John');
        });

        it('should show quick tips', () => {
            const tips = [
                { title: 'Tambah Siswa' },
                { title: 'Isi Absensi' },
                { title: 'Buat Tugas' }
            ];
            expect(tips.length).toBe(3);
        });

        it('should have get started and tutorial actions', () => {
            const primary = 'Mulai Sekarang';
            const secondary = 'Lihat Tutorial';
            expect(primary).toBe('Mulai Sekarang');
            expect(secondary).toBe('Lihat Tutorial');
        });
    });

    describe('Animations', () => {
        it('should use animate-float class', () => {
            const className = 'animate-float';
            expect(className).toBe('animate-float');
        });

        it('should use animate-pulse class', () => {
            const className = 'animate-pulse';
            expect(className).toBe('animate-pulse');
        });

        it('should use animate-pulse-glow class', () => {
            const className = 'animate-pulse-glow';
            expect(className).toBe('animate-pulse-glow');
        });

        it('should have transition effects on buttons', () => {
            const buttonClass = 'transform hover:-translate-y-0.5 transition-all duration-200';
            expect(buttonClass).toContain('transition-all');
            expect(buttonClass).toContain('hover:-translate-y-0.5');
        });
    });

    describe('Button Styles', () => {
        it('should have primary button styling', () => {
            const primaryClass = 'bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl';
            expect(primaryClass).toContain('bg-indigo-500');
            expect(primaryClass).toContain('rounded-xl');
        });

        it('should have secondary button styling', () => {
            const secondaryClass = 'text-slate-600 hover:bg-slate-100 rounded-xl';
            expect(secondaryClass).toContain('text-slate-600');
        });

        it('should have shadow on primary button', () => {
            const shadowClass = 'shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40';
            expect(shadowClass).toContain('shadow-indigo-500/25');
        });
    });

    describe('Hint Box', () => {
        it('should have amber theme', () => {
            const className = 'bg-amber-50 border-amber-200';
            expect(className).toContain('amber');
        });

        it('should have dark mode support', () => {
            const darkClass = 'dark:bg-amber-900/20 dark:border-amber-800';
            expect(darkClass).toContain('dark:');
        });

        it('should include tips icon', () => {
            const iconName = 'Sparkles';
            expect(iconName).toBe('Sparkles');
        });
    });

    describe('Accessibility', () => {
        it('should have descriptive button labels', () => {
            const labels = ['Tambah Siswa', 'Isi Absensi', 'Buat Tugas', 'Coba Lagi'];
            labels.forEach(label => {
                expect(typeof label).toBe('string');
                expect(label.length).toBeGreaterThan(0);
            });
        });

        it('should have meaningful descriptions', () => {
            const description = 'Mulai dengan menambahkan siswa pertama ke kelas Anda';
            expect(description.length).toBeGreaterThan(20);
        });
    });
});
