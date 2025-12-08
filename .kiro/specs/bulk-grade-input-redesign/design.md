# Design Document: Redesign UI Input Nilai Cepat

## Overview

Redesign ini bertujuan untuk menyeragamkan tampilan UI menu Input Nilai Cepat agar konsisten dengan design system yang sudah ada di aplikasi Portal Guru. Fokus utama adalah pada konsistensi visual, peningkatan user experience, dan penambahan fitur-fitur yang kurang seperti import/export Excel, keyboard navigation, autosave, dan statistics preview.

### Goals

1. **Visual Consistency**: Menggunakan glass card, gradient indigo-purple, dan spacing/typography yang konsisten dengan menu lainnya
2. **Enhanced UX**: Menambahkan quick actions, keyboard shortcuts, dan real-time validation
3. **Data Management**: Import dari Excel/CSV dan export template untuk workflow yang lebih efisien
4. **Performance**: Virtualization untuk kelas besar (>30 siswa) dan optimistic updates
5. **Accessibility**: ARIA labels, keyboard navigation, dan screen reader support

### Current State vs Target State

**Current State:**
- Tampilan berbeda dengan menu lainnya
- Tidak ada import/export Excel
- Tidak ada keyboard shortcuts
- Tidak ada statistics preview
- Tidak ada autosave draft

**Target State:**
- Glass card dengan glassmorphism effect
- Import/Export Excel dengan drag & drop
- Keyboard shortcuts (Ctrl+S, Tab, Enter, Escape)
- Real-time statistics preview
- Autosave draft ke localStorage

## Architecture

### Component Hierarchy

```
BulkGradeInputPage
├── Header Section
│   ├── Breadcrumb Navigation
│   ├── Page Title & Description
│   └── Action Buttons (Import, Export, Keyboard Help)
├── Configuration Card (Glass Card)
│   ├── Class Selector
│   ├── Subject Selector
│   └── Assessment Name Input
├── Statistics Preview Card
│   ├── Average Score
│   ├── Highest Score
│   ├── Lowest Score
│   └── Students Above KKM
├── Quick Actions Toolbar
│   ├── Bulk Fill Button
│   ├── Fill All Button
│   ├── Clear All Button
│   └── Import Excel Button
├── Student List
│   ├── Table View (Desktop)
│   └── Card View (Mobile)
└── Save Button (Sticky)
```

### State Management

```typescript
// Page State
interface BulkGradeInputState {
  // Configuration
  selectedClass: string;
  selectedSubject: string;
  assessmentName: string;
  
  // Grade Data
  grades: GradeEntry[];
  
  // UI State
  isConfigOpen: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  showKeyboardHelp: boolean;
  showDraftPrompt: boolean;
  
  // Validation
  validationErrors: Record<string, string>;
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  isImporting: boolean;
}

interface GradeEntry {
  studentId: string;
  studentName: string;
  score: number | '';
}
```

### Data Flow

```
User Input → Validation → State Update → Autosave → UI Update
                                      ↓
                              Statistics Calculation
                                      ↓
                              Real-time Preview
```

## Components and Interfaces

### 1. Header Component

**Purpose**: Menampilkan judul halaman, breadcrumb, dan action buttons

**Props**:
```typescript
interface HeaderProps {
  onImportClick: () => void;
  onExportClick: () => void;
  onKeyboardHelpClick: () => void;
}
```

**Design**:
- Breadcrumb: `Home > Input Nilai Cepat`
- Title: `text-3xl md:text-4xl font-bold font-serif`
- Description: `text-gray-600 dark:text-gray-400`
- Action buttons: `flex gap-2` dengan icon dan label

### 2. Configuration Card Component

**Purpose**: Form untuk memilih kelas, mata pelajaran, dan nama penilaian

**Props**:
```typescript
interface ConfigurationCardProps {
  selectedClass: string;
  selectedSubject: string;
  assessmentName: string;
  classes: ClassRow[];
  subjects: string[];
  isOpen: boolean;
  onClassChange: (classId: string) => void;
  onSubjectChange: (subject: string) => void;
  onAssessmentNameChange: (name: string) => void;
  onToggle: () => void;
}
```

**Design**:
- Glass card: `rounded-3xl border border-white/10 shadow-xl backdrop-blur-sm`
- Gradient background: `bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20`
- Icons: `GraduationCap`, `BookOpen`, `FileText`
- Collapsible dengan smooth animation

### 3. Statistics Preview Component

**Purpose**: Menampilkan statistik nilai real-time

**Props**:
```typescript
interface StatisticsPreviewProps {
  grades: GradeEntry[];
  kkm: number;
}
```

**Calculated Stats**:
```typescript
interface GradeStatistics {
  average: number;
  highest: number;
  lowest: number;
  aboveKkmCount: number;
  belowKkmCount: number;
  totalFilled: number;
}
```

**Design**:
- Grid: `grid-cols-2 sm:grid-cols-4 gap-3`
- Color-coded cards:
  - Average: Blue (`bg-blue-50 dark:bg-blue-900/20`)
  - Highest: Green (`bg-green-50 dark:bg-green-900/20`)
  - Lowest: Orange (`bg-amber-50 dark:bg-amber-900/20`)
  - Above KKM: Purple (`bg-purple-50 dark:bg-purple-900/20`)

### 4. Quick Actions Toolbar Component

**Purpose**: Tombol aksi cepat untuk bulk operations

**Props**:
```typescript
interface QuickActionsToolbarProps {
  onBulkFill: (value: number) => void;
  onFillAll: (value: number) => void;
  onClearAll: () => void;
  onImport: () => void;
  kkm: number;
}
```

**Actions**:
- Bulk Fill (Kosong → 100)
- Bulk Fill (Kosong → KKM)
- Fill All (Semua → 100)
- Clear All
- Import Excel

### 5. Student List Component

**Purpose**: Daftar siswa dengan input nilai

**Props**:
```typescript
interface StudentListProps {
  students: StudentRow[];
  grades: GradeEntry[];
  existingGrades: ExistingGrade[];
  kkm: number;
  onScoreChange: (studentId: string, score: string) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  validationErrors: Record<string, string>;
}
```

**Design**:
- Desktop: Table view dengan fixed header
- Mobile: Card view dengan swipe gestures
- Color indicators:
  - Green: `score >= kkm`
  - Amber: `60 <= score < kkm`
  - Red: `score < 60`
- Validation feedback: Real-time error messages

### 6. Import Modal Component

**Purpose**: Modal untuk import nilai dari Excel/CSV

**Props**:
```typescript
interface ImportModalProps {
  isOpen: boolean;
  students: StudentRow[];
  onClose: () => void;
  onImport: (data: ImportedGrade[]) => void;
}
```

**Features**:
- Drag & drop area
- File validation (xlsx, csv)
- Preview data dengan mapping columns
- Match student names automatically

### 7. Export Template Component

**Purpose**: Generate dan download template Excel

**Props**:
```typescript
interface ExportTemplateProps {
  students: StudentRow[];
  className: string;
  subject: string;
}
```

**Template Structure**:
```
| No | Nama Siswa | Nilai |
|----|------------|-------|
| 1  | Ahmad      | [0-100] |
| 2  | Budi       | [0-100] |
```

## Data Models

### Grade Entry Model

```typescript
interface GradeEntry {
  studentId: string;
  studentName: string;
  score: number | '';
}
```

### Validation Error Model

```typescript
interface ValidationError {
  studentId: string;
  field: 'score';
  message: string;
}
```

### Draft Model (LocalStorage)

```typescript
interface GradeDraft {
  classId: string;
  subject: string;
  assessmentName: string;
  grades: GradeEntry[];
  timestamp: number;
}
```

### Import Data Model

```typescript
interface ImportedGrade {
  studentName: string;
  score: number;
  matched: boolean;
  studentId?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable criteria, I've identified the following consolidations:

**Redundant Properties to Consolidate:**
1. **Keyboard Navigation (7.1, 7.2, 7.3)** - Can be combined into one comprehensive property about focus movement
2. **Responsive Rendering (5.1, 13.1, 13.5)** - Can be combined into one property about viewport-based rendering
3. **Color Indicators (5.4, 11.2)** - Can be combined into one property about score-based coloring
4. **Screen Reader Announcements (14.4, 14.5)** - Can be combined into one property about aria-live announcements
5. **Template Generation (9.1, 9.2, 9.3, 9.4, 9.5)** - Can be combined into one comprehensive property about template structure

**Properties to Keep Separate:**
- Statistics calculation (4.1) - Unique validation of real-time updates
- Import matching (8.4) - Unique validation of name matching algorithm
- Autosave cycle (10.1, 10.2, 10.3, 10.4, 10.5) - Each step is distinct in the workflow
- Validation feedback (5.5, 11.1) - Different types of validation
- Performance optimizations (15.1, 15.2, 15.3, 15.4, 15.5) - Each is a distinct optimization

### Correctness Properties

Property 1: Statistics Real-time Update
*For any* grade entry change, the statistics preview (average, highest, lowest, above KKM count) should recalculate and update immediately to reflect the new data
**Validates: Requirements 4.1**

Property 2: Keyboard Focus Navigation
*For any* focused input field, pressing Tab or Enter should move focus to the next input, pressing Shift+Tab should move to the previous input, and pressing Escape should remove focus
**Validates: Requirements 7.1, 7.2, 7.3, 7.5**

Property 3: Keyboard Save Shortcut
*For any* page state with filled grades, pressing Ctrl+S should trigger the save function
**Validates: Requirements 7.4**

Property 4: Score Color Indicator
*For any* grade score, the color indicator should be green if score >= KKM, amber if 60 <= score < KKM, and red if score < 60
**Validates: Requirements 5.4, 11.2**

Property 5: Validation Feedback
*For any* score input, if the value is outside the range 0-100, an error message should appear immediately below the input
**Validates: Requirements 5.5, 11.1**

Property 6: File Format Validation
*For any* uploaded file, the system should validate that the format is xlsx or csv before processing
**Validates: Requirements 8.2**

Property 7: Import Name Matching
*For any* imported data row, the system should match the student name (case-insensitive) with existing students and fill the corresponding grade
**Validates: Requirements 8.4**

Property 8: Import Success Feedback
*For any* completed import operation, a toast notification should display the count of successfully imported grades
**Validates: Requirements 8.5**

Property 9: Template Generation Structure
*For any* export template request, the generated Excel file should contain columns (No, Nama Siswa, Nilai), include all students from the selected class, have data validation (0-100) on the Nilai column, include a header with class and subject name, and be named "Template_Nilai_{Kelas}_{Mapel}.xlsx"
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

Property 10: Autosave Interval
*For any* page state with modified grades, the system should save a draft to localStorage every 30 seconds
**Validates: Requirements 10.1**

Property 11: Draft Detection
*For any* page load, if a draft exists in localStorage for the current class/subject/assessment combination, the system should detect it and display a restore prompt
**Validates: Requirements 10.2, 10.3**

Property 12: Draft Restoration
*For any* draft restoration action, the restored grades should exactly match the saved draft data
**Validates: Requirements 10.4**

Property 13: Draft Cleanup
*For any* successful save operation, the corresponding draft should be removed from localStorage
**Validates: Requirements 10.5**

Property 14: Overwrite Confirmation
*For any* grade input where an existing grade already exists for that student, a confirmation dialog should appear before overwriting
**Validates: Requirements 11.3**

Property 15: Empty Grades Confirmation
*For any* save attempt where some students have empty grades, a confirmation dialog should appear asking whether to proceed
**Validates: Requirements 11.4**

Property 16: Error Toast Display
*For any* failed save operation, an error toast should appear with an actionable error message
**Validates: Requirements 11.5**

Property 17: Save Loading State
*For any* save operation in progress, all input fields and buttons should be disabled until the operation completes
**Validates: Requirements 12.4**

Property 18: Responsive View Rendering
*For any* viewport width, the system should render table view on desktop (>= 1024px), card view on mobile (< 768px), and appropriate layout on tablet (768px - 1023px)
**Validates: Requirements 5.1, 13.1, 13.5**

Property 19: Responsive Stats Grid
*For any* viewport width, the statistics grid should use 2 columns on mobile, 4 columns on tablet and desktop
**Validates: Requirements 13.4**

Property 20: Bottom Sheet on Mobile
*For any* mobile viewport (< 768px), quick actions should be displayed in a bottom sheet instead of inline toolbar
**Validates: Requirements 13.2**

Property 21: ARIA Labels Presence
*For any* input field, a proper aria-label attribute should be present describing the input purpose
**Validates: Requirements 14.1**

Property 22: Focus Ring Visibility
*For any* focused input, a visible focus ring (ring-2 ring-indigo-500) should be displayed
**Validates: Requirements 14.3**

Property 23: Screen Reader Announcements
*For any* error or success event, an aria-live region should announce the message to screen readers
**Validates: Requirements 14.4, 14.5**

Property 24: Virtualization Threshold
*For any* student list with more than 30 students, the system should use virtualization to render only visible rows
**Validates: Requirements 15.1**

Property 25: Validation Debouncing
*For any* score input, validation should be debounced by 300ms to avoid running on every keystroke
**Validates: Requirements 15.2**

Property 26: Lazy Image Loading
*For any* student avatar image, the image should be loaded lazily (only when visible in viewport)
**Validates: Requirements 15.3**

Property 27: Optimistic UI Updates
*For any* save operation, the UI should update immediately (optimistically) before receiving server confirmation
**Validates: Requirements 15.4**

Property 28: Data Caching
*For any* data fetch operation, React Query should cache the response to avoid redundant network requests
**Validates: Requirements 15.5**

Property 29: Collapsible Configuration
*For any* configuration card, clicking the toggle button should smoothly animate the card between expanded and collapsed states
**Validates: Requirements 3.5**

Property 30: Progress Bar Accuracy
*For any* set of grades, the ketuntasan progress bar should display the correct percentage of students with scores >= KKM
**Validates: Requirements 4.5**

## Error Handling

### Validation Errors

**Client-side Validation:**
```typescript
interface ValidationRule {
  field: string;
  validate: (value: any) => boolean;
  message: string;
}

const gradeValidationRules: ValidationRule[] = [
  {
    field: 'score',
    validate: (value) => value === '' || (value >= 0 && value <= 100),
    message: 'Nilai harus antara 0-100'
  },
  {
    field: 'assessmentName',
    validate: (value) => value.trim().length > 0,
    message: 'Nama penilaian harus diisi'
  },
  {
    field: 'subject',
    validate: (value) => value.trim().length > 0,
    message: 'Mata pelajaran harus dipilih'
  }
];
```

**Error Display Strategy:**
- Inline errors: Show below input field with red text
- Toast errors: Show for system/network errors
- Modal errors: Show for critical errors requiring user action

### Network Errors

**Retry Strategy:**
```typescript
const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR_5XX']
};
```

**Offline Handling:**
- Detect offline status
- Queue save operations
- Show offline banner
- Sync when back online

### Data Integrity Errors

**Conflict Resolution:**
- Detect existing grades before save
- Show confirmation dialog for overwrites
- Preserve original data in case of rollback

**Transaction Safety:**
- Use database transactions for bulk operations
- Rollback on any error
- Show clear error messages

### User Input Errors

**Graceful Degradation:**
- Invalid file format → Show error, allow retry
- Import name mismatch → Show unmatched names, allow manual mapping
- Empty required fields → Highlight fields, prevent submit

## Testing Strategy

### Unit Testing

**Components to Test:**
- Header component renders correctly
- Configuration card toggles properly
- Statistics calculations are accurate
- Student list renders with correct data
- Import modal validates files correctly
- Export generates correct template

**Test Framework:** Vitest + React Testing Library

**Example Unit Test:**
```typescript
describe('Statistics Calculation', () => {
  it('should calculate average correctly', () => {
    const grades = [
      { studentId: '1', studentName: 'A', score: 80 },
      { studentId: '2', studentName: 'B', score: 90 },
      { studentId: '3', studentName: 'C', score: 70 }
    ];
    const stats = calculateGradeStats(grades);
    expect(stats.average).toBe(80);
  });
  
  it('should count students above KKM', () => {
    const grades = [
      { studentId: '1', studentName: 'A', score: 80 },
      { studentId: '2', studentName: 'B', score: 60 },
      { studentId: '3', studentName: 'C', score: 90 }
    ];
    const stats = calculateGradeStats(grades, 75);
    expect(stats.aboveKkmCount).toBe(2);
  });
});
```

### Property-Based Testing

**Testing Library:** fast-check (JavaScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Use shrinking to find minimal failing cases
- Tag each test with corresponding property number

**Property Test Examples:**

```typescript
import fc from 'fast-check';

/**
 * Feature: bulk-grade-input-redesign, Property 1: Statistics Real-time Update
 * For any grade entry change, statistics should recalculate correctly
 */
describe('Property 1: Statistics Real-time Update', () => {
  it('should recalculate statistics for any grade changes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          studentId: fc.uuid(),
          studentName: fc.string({ minLength: 1 }),
          score: fc.oneof(fc.constant(''), fc.integer({ min: 0, max: 100 }))
        }), { minLength: 1, maxLength: 50 }),
        (grades) => {
          const stats = calculateGradeStats(grades);
          
          // Verify average is within valid range
          if (stats.totalFilled > 0) {
            expect(stats.average).toBeGreaterThanOrEqual(0);
            expect(stats.average).toBeLessThanOrEqual(100);
          }
          
          // Verify highest >= lowest
          if (stats.totalFilled > 0) {
            expect(stats.highest).toBeGreaterThanOrEqual(stats.lowest);
          }
          
          // Verify counts add up
          expect(stats.aboveKkmCount + stats.belowKkmCount).toBeLessThanOrEqual(stats.totalFilled);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 4: Score Color Indicator
 * For any score, color should match the defined rules
 */
describe('Property 4: Score Color Indicator', () => {
  it('should return correct color for any score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 60, max: 90 }), // KKM range
        (score, kkm) => {
          const color = getScoreColor(score, kkm);
          
          if (score >= kkm) {
            expect(color).toBe('green');
          } else if (score >= 60) {
            expect(color).toBe('amber');
          } else {
            expect(color).toBe('red');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 7: Import Name Matching
 * For any imported data, names should match case-insensitively
 */
describe('Property 7: Import Name Matching', () => {
  it('should match student names case-insensitively', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 3, maxLength: 20 })
        }), { minLength: 1, maxLength: 30 }),
        fc.array(fc.record({
          studentName: fc.string({ minLength: 3, maxLength: 20 }),
          score: fc.integer({ min: 0, max: 100 })
        }), { minLength: 1, maxLength: 30 }),
        (students, importData) => {
          const matched = matchImportData(students, importData);
          
          // Every matched item should have a valid student ID
          matched.filter(m => m.matched).forEach(item => {
            expect(item.studentId).toBeDefined();
            const student = students.find(s => s.id === item.studentId);
            expect(student).toBeDefined();
            expect(student!.name.toLowerCase()).toBe(item.studentName.toLowerCase());
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 9: Template Generation Structure
 * For any class data, template should have correct structure
 */
describe('Property 9: Template Generation Structure', () => {
  it('should generate template with correct structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          className: fc.string({ minLength: 1 }),
          subject: fc.string({ minLength: 1 }),
          students: fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 })
          }), { minLength: 1, maxLength: 40 })
        }),
        (classData) => {
          const template = generateExcelTemplate(classData);
          
          // Verify columns exist
          expect(template.columns).toContain('No');
          expect(template.columns).toContain('Nama Siswa');
          expect(template.columns).toContain('Nilai');
          
          // Verify all students are included
          expect(template.rows.length).toBe(classData.students.length);
          
          // Verify filename format
          expect(template.filename).toMatch(/^Template_Nilai_.*\.xlsx$/);
          
          // Verify data validation on Nilai column
          expect(template.validation.column).toBe('Nilai');
          expect(template.validation.min).toBe(0);
          expect(template.validation.max).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 12: Draft Restoration
 * For any draft, restored data should match saved data
 */
describe('Property 12: Draft Restoration', () => {
  it('should restore draft exactly as saved', () => {
    fc.assert(
      fc.property(
        fc.record({
          classId: fc.uuid(),
          subject: fc.string({ minLength: 1 }),
          assessmentName: fc.string({ minLength: 1 }),
          grades: fc.array(fc.record({
            studentId: fc.uuid(),
            studentName: fc.string({ minLength: 1 }),
            score: fc.oneof(fc.constant(''), fc.integer({ min: 0, max: 100 }))
          }), { minLength: 1, maxLength: 30 })
        }),
        (draft) => {
          // Save draft
          saveDraft(draft);
          
          // Restore draft
          const restored = restoreDraft(draft.classId, draft.subject, draft.assessmentName);
          
          // Verify exact match
          expect(restored).toEqual(draft);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 18: Responsive View Rendering
 * For any viewport width, correct view should render
 */
describe('Property 18: Responsive View Rendering', () => {
  it('should render correct view based on viewport', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // viewport width
        (viewportWidth) => {
          const view = getViewMode(viewportWidth);
          
          if (viewportWidth >= 1024) {
            expect(view).toBe('table');
          } else if (viewportWidth < 768) {
            expect(view).toBe('card');
          } else {
            expect(view).toMatch(/table|card/); // tablet can use either
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 24: Virtualization Threshold
 * For any student count > 30, virtualization should be used
 */
describe('Property 24: Virtualization Threshold', () => {
  it('should use virtualization for large lists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (studentCount) => {
          const shouldVirtualize = checkVirtualization(studentCount);
          
          if (studentCount > 30) {
            expect(shouldVirtualize).toBe(true);
          } else {
            expect(shouldVirtualize).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: bulk-grade-input-redesign, Property 30: Progress Bar Accuracy
 * For any set of grades, progress bar should show correct percentage
 */
describe('Property 30: Progress Bar Accuracy', () => {
  it('should calculate correct ketuntasan percentage', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          studentId: fc.uuid(),
          studentName: fc.string({ minLength: 1 }),
          score: fc.integer({ min: 0, max: 100 })
        }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 60, max: 90 }), // KKM
        (grades, kkm) => {
          const percentage = calculateKetuntasanPercentage(grades, kkm);
          
          // Verify percentage is valid
          expect(percentage).toBeGreaterThanOrEqual(0);
          expect(percentage).toBeLessThanOrEqual(100);
          
          // Verify calculation
          const aboveKkm = grades.filter(g => g.score >= kkm).length;
          const expected = Math.round((aboveKkm / grades.length) * 100);
          expect(percentage).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scenarios to Test:**
1. Complete workflow: Select class → Fill grades → Save → Verify in database
2. Import workflow: Upload Excel → Preview → Confirm → Verify grades filled
3. Export workflow: Click export → Download template → Verify file structure
4. Autosave workflow: Fill grades → Wait 30s → Reload page → Verify draft prompt
5. Keyboard navigation: Tab through all inputs → Press Ctrl+S → Verify save

**Test Framework:** Vitest + React Testing Library + MSW (Mock Service Worker)

### End-to-End Testing

**User Flows:**
1. Teacher opens page → Selects class → Fills grades → Saves successfully
2. Teacher imports Excel → Reviews matches → Confirms → Grades filled
3. Teacher fills partial grades → Leaves page → Returns → Restores draft
4. Teacher uses keyboard only → Navigates all inputs → Saves with Ctrl+S

**Test Framework:** Playwright or Cypress

### Accessibility Testing

**Tools:**
- axe-core for automated accessibility checks
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)

**Checklist:**
- [ ] All inputs have labels
- [ ] Focus order is logical
- [ ] Focus indicators are visible
- [ ] Error messages are announced
- [ ] Success messages are announced
- [ ] Keyboard shortcuts work
- [ ] Color contrast meets WCAG AA

### Performance Testing

**Metrics to Monitor:**
- Initial page load time < 2s
- Time to interactive < 3s
- Virtualization kicks in at 30+ students
- Debouncing delays validation by 300ms
- Images load lazily
- No unnecessary re-renders

**Tools:**
- Lighthouse for performance audits
- React DevTools Profiler
- Chrome DevTools Performance tab

## Implementation Notes

### Technology Stack

- **Framework**: React 18 with TypeScript
- **State Management**: React Query for server state, useState for local state
- **Styling**: Tailwind CSS with design system tokens
- **Forms**: React Hook Form for form management
- **Validation**: Zod for schema validation
- **File Handling**: xlsx library for Excel operations
- **Testing**: Vitest + React Testing Library + fast-check

### Key Libraries

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-query": "^5.0.0",
    "react-hook-form": "^7.45.0",
    "zod": "^3.22.0",
    "xlsx": "^0.18.5",
    "react-virtual": "^2.10.4"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "fast-check": "^3.15.0"
  }
}
```

### File Structure

```
src/components/pages/
├── BulkGradeInputPage.tsx          # Main page component
├── bulk-grade-input/
│   ├── components/
│   │   ├── Header.tsx              # Header with breadcrumb and actions
│   │   ├── ConfigurationCard.tsx   # Class/subject/assessment selector
│   │   ├── StatisticsPreview.tsx   # Real-time stats display
│   │   ├── QuickActionsToolbar.tsx # Bulk action buttons
│   │   ├── StudentList.tsx         # Student list with inputs
│   │   ├── StudentListItem.tsx     # Individual student row/card
│   │   ├── ImportModal.tsx         # Excel import modal
│   │   └── ExportTemplate.tsx      # Template generation
│   ├── hooks/
│   │   ├── useGradeInput.ts        # Grade input logic
│   │   ├── useAutosave.ts          # Autosave functionality
│   │   ├── useKeyboardNav.ts       # Keyboard navigation
│   │   └── useImportExport.ts      # Import/export logic
│   ├── utils/
│   │   ├── gradeCalculations.ts    # Statistics calculations
│   │   ├── gradeValidation.ts      # Validation rules
│   │   ├── excelUtils.ts           # Excel operations
│   │   └── draftManager.ts         # LocalStorage draft management
│   └── types.ts                    # TypeScript types
```

### Migration Strategy

1. **Phase 1**: Create new components alongside existing code
2. **Phase 2**: Implement core functionality (configuration, student list, save)
3. **Phase 3**: Add import/export features
4. **Phase 4**: Add keyboard navigation and autosave
5. **Phase 5**: Add statistics preview and quick actions
6. **Phase 6**: Replace old BulkGradeInputPage with new implementation
7. **Phase 7**: Remove old code and cleanup

### Backward Compatibility

- Maintain existing API contracts
- Support existing data structures
- Graceful fallback for unsupported features
- Migration script for localStorage drafts

---

*Design document completed. Ready for implementation planning.*
