import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { FileDown, Printer } from 'lucide-react';

vi.mock('../../src/utils/i18n', () => ({
  useTranslation: () => ({
    t: {
      lessonPlan: {
        title: 'Pembuat Modul Ajar',
        previous: 'Sebelumnya',
        next: 'Berikutnya',
        create: 'Buat {type}',
        documentType: 'Jenis Dokumen',
        curriculumApproach: 'Pendekatan Kurikulum',
        documentTypeModulAjar: 'Modul Ajar',
        documentTypeRpp: 'RPP',
      },
    },
  }),
}));

vi.mock('../../src/components/pages/modul-ajar/hooks/useModulAjarQueries', () => ({
  useTopikRecommendations: () => ({ data: [] }),
  useRubrikTemplates: () => ({ data: [] }),
  useTemaKbc: () => ({ data: [] }),
  useMateriInsersiMulti: () => ({ data: [] }),
  useLearningModels: () => ({ data: [] }),
}));

import { DownloadMenu } from '../../src/components/pages/modul-ajar/components/DownloadMenu';
import { ModulAjarToolbar } from '../../src/components/pages/modul-ajar/components/ModulAjarToolbar';
import { ModulAjarForm } from '../../src/components/pages/modul-ajar/components/ModulAjarForm';
import type { FormState } from '../../src/components/pages/modul-ajar/types';

const labels = {
  preview: 'Pratinjau',
  history: 'Riwayat Modul Ajar',
  copy: 'Salin Teks',
  pdf: 'Unduh PDF',
  word: 'Unduh Word',
  print: 'Cetak',
};

const toolbarProps = {
  activeTab: 'preview' as const,
  onTabChange: vi.fn(),
  historyCount: 12,
  hasDocument: true,
  busyFormat: null,
  onExportPdf: vi.fn(),
  onExportWord: vi.fn(),
  onPrint: vi.fn(),
  onCopy: vi.fn(),
  onFullscreen: vi.fn(),
  wordExtension: 'docx' as const,
  labels,
};

describe('DownloadMenu', () => {
  const items = (onPdf = vi.fn(), onPrint = vi.fn()) => [
    { id: 'pdf', label: 'Unduh PDF', icon: FileDown, onSelect: onPdf },
    { id: 'print', label: 'Cetak', icon: Printer, onSelect: onPrint },
  ];

  it('opens on click, focuses the first item, and runs the chosen action once', () => {
    const onPdf = vi.fn();
    render(<DownloadMenu items={items(onPdf)} />);
    const trigger = screen.getByRole('button', { name: /Unduh/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const [first] = screen.getAllByRole('menuitem');
    expect(first).toHaveFocus();

    fireEvent.click(first);
    expect(onPdf).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('moves with arrow keys and returns focus to the trigger on Escape', () => {
    render(<DownloadMenu items={items()} />);
    const trigger = screen.getByRole('button', { name: /Unduh/ });
    fireEvent.click(trigger);
    const [first, second] = screen.getAllByRole('menuitem');

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'ArrowDown' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'End' });
    expect(second).toHaveFocus();

    fireEvent.keyDown(second, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when the pointer goes down outside', () => {
    render(
      <div>
        <button type="button">luar</button>
        <DownloadMenu items={items()} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Unduh/ }));
    fireEvent.mouseDown(screen.getByText('luar'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('locks the trigger while an export runs and when there is nothing to export', () => {
    const { rerender } = render(<DownloadMenu items={items()} busy />);
    const busyTrigger = screen.getByRole('button', { name: /Memproses/ });
    expect(busyTrigger).toBeDisabled();
    expect(busyTrigger).toHaveAttribute('aria-busy', 'true');

    rerender(<DownloadMenu items={items()} disabled />);
    expect(screen.getByRole('button', { name: /Unduh/ })).toBeDisabled();
  });
});

describe('ModulAjarToolbar', () => {
  it('offers PDF, Word, print, and the phone-only extras in a single menu', () => {
    render(<ModulAjarToolbar {...toolbarProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Unduh/ }));
    const menu = screen.getByRole('menu');
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(names.join('|')).toMatch(/Unduh PDF.*Unduh Word.*Cetak.*Salin Teks.*Layar penuh/);
    expect(within(menu).getByText(/Berkas \.docx/)).toBeInTheDocument();
  });

  it('names the legacy Word format honestly and runs the selected export', () => {
    const onExportWord = vi.fn();
    render(<ModulAjarToolbar {...toolbarProps} wordExtension="doc" onExportWord={onExportWord} />);
    fireEvent.click(screen.getByRole('button', { name: /Unduh/ }));
    expect(screen.getByText(/Berkas \.doc,/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /Unduh Word/ }));
    expect(onExportWord).toHaveBeenCalledTimes(1);
  });

  it('shows the history count, marks the selected tab, and disables export without a document', () => {
    render(<ModulAjarToolbar {...toolbarProps} hasDocument={false} />);
    expect(screen.getByRole('tab', { name: /Pratinjau/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Riwayat/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh/ })).toBeDisabled();
    expect(screen.getByTitle('Salin Teks')).toBeDisabled();
  });

  it('hides document actions on the history tab', () => {
    render(<ModulAjarToolbar {...toolbarProps} activeTab="history" />);
    expect(screen.queryByRole('button', { name: /Unduh/ })).not.toBeInTheDocument();
  });
});

const formState = {
  generationMethod: 'Manual',
  documentType: 'Modul Ajar',
  curriculumApproach: 'Merdeka',
  satuanPendidikan: 'MI Contoh',
  jenjang: 'MI',
  kelas: '3',
  fase: 'B',
  mataPelajaran: '',
  topik: '',
  tahunAjaran: '2026/2027',
  semester: '1',
  guru: 'Guru',
  targetPeserta: 'Reguler',
  kompetensiAwal: '',
  saranaPrasarana: '',
  capaianPembelajaran: '',
  profilPelajar: [],
  jumlahPertemuan: 1,
  jpPerPertemuan: 2,
  durasiPerJp: 35,
  modelPembelajaran: 'Problem Based Learning',
  metodePembelajaran: [],
  manualTujuanPembelajaran: '',
  manualPertanyaanPemantik: '',
  manualLkpdTugas: '',
  manualSoalEvaluasi: '',
  alokasiPendahuluan: 10,
  alokasiInti: 50,
  alokasiPenutup: 10,
  rubrikAsesmen: [],
  isKbcIntegrated: false,
  temaKbc: [],
  materiInsersi: '',
} as FormState;

function renderForm(activeStep: number, overrides: Partial<FormState> = {}, setActiveStep = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = {
    formState: { ...formState, ...overrides },
    onChange: vi.fn(),
    onProfilToggle: vi.fn(),
    onMetodeToggle: vi.fn(),
    activeStep,
    setActiveStep,
    isGeneratingCP: false,
    onGenerateCP: vi.fn(),
    models: [],
    isLoadingModels: false,
    queueStatus: 'idle',
    onGenerate: vi.fn(),
  };
  const view = render(
    <QueryClientProvider client={client}>
      <ModulAjarForm {...props} />
    </QueryClientProvider>,
  );
  const rerenderAt = (step: number) =>
    view.rerender(
      <QueryClientProvider client={client}>
        <ModulAjarForm {...props} activeStep={step} />
      </QueryClientProvider>,
    );
  return { ...view, props, rerenderAt };
}

describe('ModulAjarForm wizard', () => {
  it('does not mark step 1 done before the teacher has moved on', () => {
    renderForm(1);
    expect(screen.getByRole('button', { name: 'Langkah 1: Kurikulum' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(
      screen.queryByRole('button', { name: /Langkah 1: Kurikulum, selesai/ }),
    ).not.toBeInTheDocument();
  });

  it('marks step 1 done with a check once the teacher moves past it', () => {
    const { rerenderAt } = renderForm(1);
    rerenderAt(2);
    const pill = screen.getByRole('button', { name: 'Langkah 1: Kurikulum, selesai' });
    expect(pill.querySelector('svg.lucide-check')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Langkah 2: Identitas' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('explains why generating is blocked and links back to the missing step', () => {
    const setActiveStep = vi.fn();
    renderForm(5, { mataPelajaran: 'IPAS', topik: '' }, setActiveStep);
    const generate = screen.getByRole('button', { name: /Buat Modul Ajar/ });
    expect(generate).toBeDisabled();
    expect(generate).toHaveAttribute('aria-describedby', 'generate-blocked-reason');
    expect(screen.getByRole('status')).toHaveTextContent('Isi Topik di Langkah 2');

    fireEvent.click(screen.getByRole('button', { name: 'Ke Langkah 2' }));
    expect(setActiveStep).toHaveBeenCalledWith(2);
  });

  it('enables generating without a warning once subject and topic are filled', () => {
    renderForm(5, { mataPelajaran: 'IPAS', topik: 'Siklus Air' });
    expect(screen.getByRole('button', { name: /Buat Modul Ajar/ })).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('always labels the back button with the translated text', () => {
    renderForm(2);
    expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeInTheDocument();
    expect(screen.queryByText('Kembali')).not.toBeInTheDocument();
  });
});
