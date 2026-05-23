const fs = require('fs');

const content = fs.readFileSync('src/components/pages/ChildDevelopmentAnalysisTab.tsx', 'utf8');
const lines = content.split('\n');

// radarChartUtils.ts (lines 41-74)
const radarChartUtils = lines.slice(40, 74).join('\n').replace(/const /g, 'export const ');
fs.writeFileSync('src/components/pages/student-detail/child-development/utils/radarChartUtils.ts', radarChartUtils);

// LoadingProgress.tsx (lines 84-154)
const loadingProgress = `import React from 'react';
import { BookOpenIcon, UsersIcon, TrendingUpIcon, BrainCircuitIcon, FileTextIcon, CheckCircleIcon } from '../../../../Icons';

const LOADING_STEPS = [
  { id: 1, label: 'Mengumpulkan data akademik', icon: BookOpenIcon },
  { id: 2, label: 'Menganalisis pola perilaku', icon: UsersIcon },
  { id: 3, label: 'Menghitung tren perkembangan', icon: TrendingUpIcon },
  { id: 4, label: 'Membuat rekomendasi AI', icon: BrainCircuitIcon },
  { id: 5, label: 'Menyusun laporan', icon: FileTextIcon },
];

` + lines.slice(84, 154).join('\n').replace('const LoadingProgress', 'export const LoadingProgress');
fs.writeFileSync('src/components/pages/student-detail/child-development/components/LoadingProgress.tsx', loadingProgress);

// CompLoadingProgress.tsx (lines 156-242)
const compLoadingProgress = `import React from 'react';
import { BookOpenIcon, UsersIcon, TrendingUpIcon, BrainCircuitIcon, FileTextIcon, CheckCircleIcon } from '../../../../Icons';

const COMP_LOADING_STEPS = [
  { id: 1, label: 'Mengelompokkan data Semester 1 & Semester 2', icon: BookOpenIcon },
  { id: 2, label: 'Membandingkan rata-rata nilai dan tren kognitif', icon: TrendingUpIcon },
  { id: 3, label: 'Menganalisis perbandingan kehadiran & pelanggaran', icon: UsersIcon },
  { id: 4, label: 'Merumuskan narasi perkembangan emosional (AI)', icon: BrainCircuitIcon },
  { id: 5, label: 'Menyusun laporan komparatif terpadu', icon: FileTextIcon },
];

` + lines.slice(165, 242).join('\n').replace('const CompLoadingProgress', 'export const CompLoadingProgress');
fs.writeFileSync('src/components/pages/student-detail/child-development/components/CompLoadingProgress.tsx', compLoadingProgress);

// PeriodComparison.tsx (lines 244-272)
const periodComparison = `import React from 'react';\n\n` + lines.slice(244, 272).join('\n').replace('const PeriodComparison', 'export const PeriodComparison');
fs.writeFileSync('src/components/pages/student-detail/child-development/components/PeriodComparison.tsx', periodComparison);

// ActionableRecommendation.tsx (lines 274-350)
const actionableRecommendation = `import React, { useState } from 'react';\nimport { ArrowRightIcon } from '../../../../Icons';\nimport { MarkdownText } from '../../../../ui/MarkdownText';\n\n` + lines.slice(274, 350).join('\n').replace('const ActionableRecommendation', 'export const ActionableRecommendation');
fs.writeFileSync('src/components/pages/student-detail/child-development/components/ActionableRecommendation.tsx', actionableRecommendation);

console.log('Extracted small components and utils successfully.');
