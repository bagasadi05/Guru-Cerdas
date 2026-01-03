# 📋 Rencana Perbaikan Teknis Portal Guru

Dokumen ini berisi rencana terstruktur untuk mengatasi kekurangan teknis yang telah diidentifikasi.

**Last Updated:** December 25, 2024

## 🎯 Ringkasan Progress

| Prioritas | Kategori | Status | Estimasi Waktu | Progress |
|-----------|----------|--------|----------------|----------|
| 🔴 High | Code Organization - Refactor Large Files | 🟡 In Progress | 4-6 jam | 60% |
| 🟡 Medium | Type Centralization | ✅ Complete | 2-3 jam | 100% |
| 🟡 Medium | Replace `any` Types | 🟡 In Progress | 2-3 jam | 40% |
| 🟢 Low | Documentation (JSDoc + Comments) | 🟡 In Progress | 3-4 jam | 50% |
| 🟢 Low | README Enhancement | ✅ Complete | 1-2 jam | 100% |
| 🟡 Medium | State Management Optimization | ✅ Complete | 2-3 jam | 100% |

---

## ✅ Completed Tasks

### Type Centralization (100% Complete)

Created centralized type system:

```
src/types/
├── index.ts       ✅ Updated - Central export point
├── database.ts    ✅ Created - 242 lines with JSDoc
├── enums.ts       ✅ Created - All enum definitions
├── api.ts         ✅ Created - API/data fetching types
├── components.ts  ✅ Created - Component prop types
└── forms.ts       ✅ Created - Form data types
```

### Dashboard Component Extraction (Complete)

```
src/components/dashboard/
├── index.ts                  ✅ Created - Component exports
├── AiDashboardInsight.tsx    ✅ Created - 289 lines with JSDoc
├── WeeklyAttendanceChart.tsx ✅ Created - 166 lines with JSDoc
├── StatsGrid.tsx             ✅ Created - 160 lines with JSDoc
└── GradeAuditWidget.tsx      ✅ Created - 340 lines with JSDoc
```

### State Management Optimization (Complete)

```
src/lib/
└── queryKeys.ts              ✅ Created - 288 lines query key factory
```

Features:
- ✅ Hierarchical query key structure
- ✅ Type-safe cache invalidation
- ✅ Consistent naming convention
- ✅ Filter parameter support

### Custom Hooks (Complete)

```
src/hooks/
└── useDashboardData.ts       ✅ Created - 218 lines with JSDoc
```

### README Enhancement (Complete)

- ✅ Added technology badges
- ✅ Detailed feature descriptions
- ✅ Tech stack tables
- ✅ Project structure documentation
- ✅ Testing & deployment guide
- ✅ Contribution guidelines

### `any` Type Replacements (Partial)

Fixed files:
- ✅ `src/services/offlineQueueEnhanced.ts` - Replaced with generic types
- ✅ `src/components/pages/student/types.ts` - Extended QuizPointRow, ViolationRow, CommunicationRow, ReportRow with UI fields
- ✅ `src/components/pages/mass-input/types.ts` - Extended ViolationRow with UI fields
- ✅ `src/components/pages/MassInputPage.tsx` - Fixed quiz_points and violations insert records
- ✅ `src/components/pages/DashboardPage.tsx` - Fixed null handling for class_id
- ✅ `src/components/pages/student/ActivityTab.tsx` - Fixed optional property access
- ✅ `src/components/ErrorBoundary.tsx` - Removed non-existent ErrorInfo properties
- ✅ `src/components/OfflineQueueUI.tsx` - Fixed ReactNode type error
- ✅ `src/components/attendance/AttendanceList.tsx` - Fixed avatar_url null handling
- ✅ `src/services/violationExport.ts` - Fixed StudentInfo interface

**Progress:** TypeScript errors reduced from ~153 to ~92 (40% reduction)

**Remaining ~92 errors** are mostly from:
1. Database schema mismatch - columns like `attachment_url`, `apply_quiz_points_to_grade` don't exist
2. Form/mutation type mismatches
3. Supabase RPC function types

**Solution required:**
- Regenerate `database.types.ts` from Supabase after schema update
- OR update Supabase database schema with missing columns


---

## 🟡 In Progress Tasks

### 1.1 Refactor DashboardPage.tsx

**Status:** 60% Complete

**Completed:**
- [x] AiDashboardInsight.tsx
- [x] WeeklyAttendanceChart.tsx
- [x] StatsGrid.tsx
- [x] GradeAuditWidget.tsx
- [x] useDashboardData.ts hook

**Remaining:**
- [ ] ScheduleTimeline.tsx
- [ ] TasksList.tsx
- [ ] QuickActions.tsx
- [ ] Update DashboardPage to use new components

### 1.2 Refactor StudentsPage.tsx (894 lines)

**Status:** 20% Complete (filters already exist)

**Remaining:**
- [ ] StudentModals.tsx - Add/Edit/Delete modals
- [ ] BulkActionsPanel.tsx - Bulk selection actions
- [ ] ExportPanel.tsx - Export functionality
- [ ] ImportPanel.tsx - Import functionality
- [ ] useStudentMutations.ts hook
- [ ] useStudentFilters.ts hook

### 1.3 Replace Remaining `any` Types

**Files to fix:**
- [ ] `exportUtils.ts` - 8 instances
- [ ] `resilientSupabase.ts` - 6 instances
- [ ] `ValidationService.ts` - 5 instances
- [ ] `performance.ts` - 5 instances
- [ ] `StudentsPage.tsx` - Various instances

### 1.4 JSDoc Documentation

**Completed:**
- [x] All new dashboard components
- [x] useDashboardData hook
- [x] All new type files
- [x] queryKeys.ts

**Remaining:**
- [ ] `src/services/*.ts` - Existing service files
- [ ] `src/hooks/*.ts` - Existing hooks
- [ ] `src/utils/*.ts` - Utility functions

---

## 📋 Remaining Work Summary

### High Priority
1. **Complete DashboardPage refactoring**
   - Extract ScheduleTimeline, TasksList, QuickActions
   - Update main DashboardPage to import new components

2. **Fix remaining `any` types in critical files**
   - exportUtils.ts
   - resilientSupabase.ts
   - ValidationService.ts

### Medium Priority
1. **Refactor StudentsPage.tsx**
   - Extract modal components
   - Create mutation hook
   - Create filter hook

2. **Add JSDoc to existing files**
   - Service layer (supabase.ts, etc.)
   - Existing hooks

### Low Priority
1. **Create additional shared hooks**
   - useModal hook
   - useSelection hook

2. **Performance optimizations**
   - Virtualized lists for large data
   - Memoization review

---

## 📊 Metrics

### Lines of Code Impact

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| DashboardPage.tsx | 921 | ~400* | 56% |
| Types scattered | ~200 | Centralized | - |
| README.md | 72 | ~300 | +316% |

*Projected after full extraction

### New Files Created

| Category | Count |
|----------|-------|
| Type definitions | 5 files |
| Dashboard components | 4 files |
| Hooks | 1 file |
| Library utilities | 1 file |
| Documentation | 1 file |
| **Total** | **12 files** |

---

## ✅ Acceptance Criteria

1. **Code Organization** ✅ ☑️
   - [x] All types centralized in `src/types/`
   - [x] Dashboard components extracted
   - [x] Query key factory implemented
   - [ ] No file exceeds 400 lines (in progress)
   - [ ] Zero `any` types in production code (in progress)

2. **Documentation** ✅ ☑️
   - [x] New components have JSDoc comments
   - [x] README has all required sections
   - [x] Complex logic has inline comments (new files)
   - [ ] All public functions have JSDoc (in progress)

3. **State Management** ✅ Complete
   - [x] Consistent query key usage
   - [x] Query key factory created
   - [x] Type-safe cache invalidation patterns
