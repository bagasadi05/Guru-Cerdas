# Implementation Plan: Redesign UI Input Nilai Cepat

## Task List

- [ ] 1. Setup project structure and utilities
- [ ] 1.1 Create folder structure for bulk-grade-input components
  - Create `src/components/pages/bulk-grade-input/` directory
  - Create subdirectories: `components/`, `hooks/`, `utils/`
  - Create `types.ts` for TypeScript interfaces
  - _Requirements: All requirements (foundation)_

- [ ] 1.2 Implement grade calculation utilities
  - Write `gradeCalculations.ts` with `calculateGradeStats()` function
  - Calculate average, highest, lowest, above/below KKM counts
  - Handle edge cases (empty grades, all empty, single grade)
  - _Requirements: 4.1, 4.2_

- [ ]* 1.3 Write property test for statistics calculation
  - **Property 1: Statistics Real-time Update**
  - **Validates: Requirements 4.1**

- [ ] 1.4 Implement grade validation utilities
  - Write `gradeValidation.ts` with validation rules
  - Validate score range (0-100)
  - Validate required fields (subject, assessment name)
  - Return validation errors with messages
  - _Requirements: 11.1, 11.2_

- [ ]* 1.5 Write property test for validation
  - **Property 5: Validation Feedback**
  - **Validates: Requirements 5.5, 11.1**

- [ ] 1.6 Implement color indicator utility
  - Write `getScoreColor()` function
  - Return 'green' for score >= KKM
  - Return 'amber' for 60 <= score < KKM
  - Return 'red' for score < 60
  - _Requirements: 5.4, 11.2_

- [ ]* 1.7 Write property test for color indicators
  - **Property 4: Score Color Indicator**
  - **Validates: Requirements 5.4, 11.2**

- [ ] 2. Implement Header component
- [ ] 2.1 Create Header component with breadcrumb and title
  - Create `components/Header.tsx`
  - Implement breadcrumb navigation (Home > Input Nilai Cepat)
  - Add page title with `text-3xl md:text-4xl font-bold font-serif`
  - Add description text with proper styling
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 2.2 Add action buttons to Header
  - Add Import Excel button
  - Add Export Template button
  - Add Keyboard Shortcuts help button
  - Use `flex gap-2` layout for responsive design
  - _Requirements: 2.3, 2.4_

- [ ]* 2.3 Write unit tests for Header component
  - Test breadcrumb renders correctly
  - Test title and description display
  - Test action buttons are present
  - Test responsive layout classes

- [ ] 3. Implement Configuration Card component
- [ ] 3.1 Create ConfigurationCard component with glass styling
  - Create `components/ConfigurationCard.tsx`
  - Apply glass-card styling: `rounded-3xl border border-white/10 shadow-xl`
  - Add gradient background: `bg-gradient-to-br from-indigo-50 to-purple-50`
  - Implement collapsible functionality with smooth animation
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 3.2 Add form fields with icons
  - Add Class selector with GraduationCap icon
  - Add Subject selector with BookOpen icon
  - Add Assessment Name input with FileText icon
  - Use Select component with `rounded-xl` styling
  - _Requirements: 3.3, 3.4_

- [ ]* 3.3 Write property test for collapsible behavior
  - **Property 29: Collapsible Configuration**
  - **Validates: Requirements 3.5**

- [ ]* 3.4 Write unit tests for ConfigurationCard
  - Test glass-card styling is applied
  - Test icons render for each field
  - Test collapsible toggle works
  - Test form field changes trigger callbacks

- [ ] 4. Implement Statistics Preview component
- [ ] 4.1 Create StatisticsPreview component
  - Create `components/StatisticsPreview.tsx`
  - Use `grid grid-cols-2 sm:grid-cols-4 gap-3` layout
  - Display average, highest, lowest, above KKM count
  - _Requirements: 4.2, 4.3_

- [ ] 4.2 Add color-coded stat cards
  - Blue card for average (`bg-blue-50 dark:bg-blue-900/20`)
  - Green card for highest (`bg-green-50 dark:bg-green-900/20`)
  - Amber card for lowest (`bg-amber-50 dark:bg-amber-900/20`)
  - Purple card for above KKM (`bg-purple-50 dark:bg-purple-900/20`)
  - _Requirements: 4.4_

- [ ] 4.3 Add ketuntasan progress bar
  - Calculate percentage of students >= KKM
  - Display progress bar with KKM threshold indicator
  - Update in real-time as grades change
  - _Requirements: 4.5_

- [ ]* 4.4 Write property test for progress bar accuracy
  - **Property 30: Progress Bar Accuracy**
  - **Validates: Requirements 4.5**

- [ ]* 4.5 Write unit tests for StatisticsPreview
  - Test all stat cards render
  - Test correct colors are applied
  - Test progress bar displays correct percentage
  - Test real-time updates when grades change

- [ ] 5. Implement Student List component
- [ ] 5.1 Create StudentList component with responsive views
  - Create `components/StudentList.tsx`
  - Implement table view for desktop (>= 1024px)
  - Implement card view for mobile (< 768px)
  - _Requirements: 5.1, 13.1, 13.5_

- [ ]* 5.2 Write property test for responsive rendering
  - **Property 18: Responsive View Rendering**
  - **Validates: Requirements 5.1, 13.1, 13.5**

- [ ] 5.3 Create StudentListItem component
  - Create `components/StudentListItem.tsx`
  - Display student avatar with `ring-2 ring-white/10`
  - Add hover effects: `hover:bg-gray-100 dark:hover:bg-gray-800`
  - Display score input with validation
  - _Requirements: 5.2, 5.3_

- [ ] 5.4 Add color indicators and validation feedback
  - Apply color based on score (green/amber/red)
  - Show validation error below input if invalid
  - Display "< KKM" warning for scores below KKM
  - _Requirements: 5.4, 5.5_

- [ ] 5.5 Implement virtualization for large lists
  - Use react-virtual for lists > 30 students
  - Render only visible rows
  - Maintain scroll position
  - _Requirements: 15.1_

- [ ]* 5.6 Write property test for virtualization threshold
  - **Property 24: Virtualization Threshold**
  - **Validates: Requirements 15.1**

- [ ]* 5.7 Write unit tests for StudentList
  - Test table view renders on desktop
  - Test card view renders on mobile
  - Test color indicators are correct
  - Test validation feedback displays
  - Test virtualization activates for large lists

- [ ] 6. Implement Quick Actions Toolbar component
- [ ] 6.1 Create QuickActionsToolbar component
  - Create `components/QuickActionsToolbar.tsx`
  - Add "Bulk Fill (Kosong → 100)" button
  - Add "Bulk Fill (Kosong → KKM)" button
  - Add "Fill All (Semua → 100)" button
  - Add "Clear All" button
  - Add "Import Excel" button
  - Use `flex flex-wrap gap-2` for responsive layout
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.2 Implement bulk fill logic
  - Fill empty grades with specified value
  - Fill all grades with specified value
  - Clear all grades
  - Show toast notification after action
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 6.3 Write unit tests for QuickActionsToolbar
  - Test all buttons render
  - Test bulk fill fills only empty grades
  - Test fill all fills all grades
  - Test clear all empties all grades
  - Test toast notifications appear

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement keyboard navigation
- [ ] 8.1 Create useKeyboardNav hook
  - Create `hooks/useKeyboardNav.ts`
  - Handle Tab key (move to next input)
  - Handle Shift+Tab key (move to previous input)
  - Handle Enter key (move to next input)
  - Handle Escape key (blur active input)
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]* 8.2 Write property test for keyboard navigation
  - **Property 2: Keyboard Focus Navigation**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 8.3 Implement Ctrl+S save shortcut
  - Listen for Ctrl+S keypress
  - Trigger save function
  - Prevent default browser save dialog
  - _Requirements: 7.4_

- [ ]* 8.4 Write property test for save shortcut
  - **Property 3: Keyboard Save Shortcut**
  - **Validates: Requirements 7.4**

- [ ] 8.5 Add keyboard shortcuts help modal
  - Create modal showing all shortcuts
  - Display on F1 key or help button click
  - List: Tab, Shift+Tab, Enter, Escape, Ctrl+S, Ctrl+I
  - _Requirements: 2.3_

- [ ]* 8.6 Write unit tests for keyboard navigation
  - Test Tab moves focus forward
  - Test Shift+Tab moves focus backward
  - Test Enter moves focus forward
  - Test Escape blurs input
  - Test Ctrl+S triggers save
  - Test help modal opens on F1

- [ ] 9. Implement Import Excel functionality
- [ ] 9.1 Create ImportModal component
  - Create `components/ImportModal.tsx`
  - Add drag & drop area for file upload
  - Validate file format (xlsx, csv only)
  - _Requirements: 8.1, 8.2_

- [ ]* 9.2 Write property test for file validation
  - **Property 6: File Format Validation**
  - **Validates: Requirements 8.2**

- [ ] 9.3 Implement Excel parsing and preview
  - Parse Excel/CSV file using xlsx library
  - Display preview table with data
  - Show column mapping interface
  - _Requirements: 8.3_

- [ ] 9.4 Implement name matching algorithm
  - Match imported names with student names (case-insensitive)
  - Highlight matched and unmatched rows
  - Allow manual mapping for unmatched names
  - _Requirements: 8.4_

- [ ]* 9.5 Write property test for name matching
  - **Property 7: Import Name Matching**
  - **Validates: Requirements 8.4**

- [ ] 9.6 Implement import confirmation and feedback
  - Fill grades with matched data on confirm
  - Show toast with count of imported grades
  - Close modal after successful import
  - _Requirements: 8.5_

- [ ]* 9.7 Write property test for import feedback
  - **Property 8: Import Success Feedback**
  - **Validates: Requirements 8.5**

- [ ]* 9.8 Write unit tests for ImportModal
  - Test modal opens on import button click
  - Test file validation rejects invalid formats
  - Test preview displays parsed data
  - Test name matching works correctly
  - Test grades fill after confirmation
  - Test toast shows correct count

- [ ] 10. Implement Export Template functionality
- [ ] 10.1 Create export template generator
  - Create `utils/excelUtils.ts` with `generateExcelTemplate()`
  - Generate Excel file with columns: No, Nama Siswa, Nilai
  - Include all students from selected class
  - Add data validation (0-100) on Nilai column
  - Add header with class name and subject
  - Name file: "Template_Nilai_{Kelas}_{Mapel}.xlsx"
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 10.2 Write property test for template generation
  - **Property 9: Template Generation Structure**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 10.3 Add export button handler
  - Trigger template generation on button click
  - Download file automatically
  - Show toast notification
  - _Requirements: 2.3_

- [ ]* 10.4 Write unit tests for export functionality
  - Test template has correct columns
  - Test all students are included
  - Test data validation is applied
  - Test header contains class and subject
  - Test filename follows pattern
  - Test file downloads on button click

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement Autosave functionality
- [ ] 12.1 Create draft manager utility
  - Create `utils/draftManager.ts`
  - Implement `saveDraft()` to save to localStorage
  - Implement `getDraft()` to retrieve from localStorage
  - Implement `clearDraft()` to remove from localStorage
  - Use key format: `bulk-grade-draft-{classId}-{subject}-{assessment}`
  - _Requirements: 10.1, 10.5_

- [ ] 12.2 Create useAutosave hook
  - Create `hooks/useAutosave.ts`
  - Auto-save draft every 30 seconds when grades change
  - Debounce save to avoid excessive writes
  - Track last saved timestamp
  - _Requirements: 10.1_

- [ ]* 12.3 Write property test for autosave interval
  - **Property 10: Autosave Interval**
  - **Validates: Requirements 10.1**

- [ ] 12.4 Implement draft detection on page load
  - Check for existing draft on component mount
  - Compare draft timestamp with current data
  - Show restore prompt modal if draft exists
  - _Requirements: 10.2, 10.3_

- [ ]* 12.5 Write property test for draft detection
  - **Property 11: Draft Detection**
  - **Validates: Requirements 10.2, 10.3**

- [ ] 12.6 Implement draft restoration
  - Restore grades from draft on user confirmation
  - Restore subject and assessment name
  - Show success toast after restoration
  - _Requirements: 10.4_

- [ ]* 12.7 Write property test for draft restoration
  - **Property 12: Draft Restoration**
  - **Validates: Requirements 10.4**

- [ ] 12.8 Implement draft cleanup after save
  - Clear draft from localStorage after successful save
  - Clear draft if user dismisses restore prompt
  - _Requirements: 10.5_

- [ ]* 12.9 Write property test for draft cleanup
  - **Property 13: Draft Cleanup**
  - **Validates: Requirements 10.5**

- [ ]* 12.10 Write unit tests for autosave
  - Test draft saves every 30 seconds
  - Test draft detection on page load
  - Test restore prompt appears when draft exists
  - Test grades restore correctly
  - Test draft clears after save
  - Test draft clears on dismiss

- [ ] 13. Implement validation and error handling
- [ ] 13.1 Add real-time validation with debouncing
  - Debounce validation by 300ms
  - Validate score range (0-100)
  - Show inline error messages
  - _Requirements: 11.1, 15.2_

- [ ]* 13.2 Write property test for validation debouncing
  - **Property 25: Validation Debouncing**
  - **Validates: Requirements 15.2**

- [ ] 13.3 Implement overwrite confirmation
  - Detect when entering grade for student with existing grade
  - Show confirmation modal before overwriting
  - Preserve original grade if user cancels
  - _Requirements: 11.3_

- [ ]* 13.4 Write property test for overwrite confirmation
  - **Property 14: Overwrite Confirmation**
  - **Validates: Requirements 11.3**

- [ ] 13.5 Implement empty grades confirmation
  - Detect when saving with some empty grades
  - Show confirmation modal asking to proceed
  - Allow user to cancel and fill remaining grades
  - _Requirements: 11.4_

- [ ]* 13.6 Write property test for empty grades confirmation
  - **Property 15: Empty Grades Confirmation**
  - **Validates: Requirements 11.4**

- [ ] 13.7 Implement error toast display
  - Show error toast on save failure
  - Include actionable error message
  - Provide retry option if applicable
  - _Requirements: 11.5_

- [ ]* 13.8 Write property test for error toast
  - **Property 16: Error Toast Display**
  - **Validates: Requirements 11.5**

- [ ]* 13.9 Write unit tests for validation and error handling
  - Test validation debounces correctly
  - Test overwrite confirmation appears
  - Test empty grades confirmation appears
  - Test error toast displays on failure
  - Test inline errors show for invalid input

- [ ] 14. Implement loading states and feedback
- [ ] 14.1 Add skeleton loaders
  - Create skeleton for configuration card
  - Create skeleton for student list (5 rows)
  - Show skeletons during initial data fetch
  - _Requirements: 12.1, 12.2_

- [ ] 14.2 Add save loading state
  - Show loading spinner in save button
  - Change button text to "Menyimpan..."
  - Disable all inputs and buttons during save
  - _Requirements: 12.3, 12.4_

- [ ]* 14.3 Write property test for save loading state
  - **Property 17: Save Loading State**
  - **Validates: Requirements 12.4**

- [ ] 14.4 Add success animation
  - Show confetti or checkmark animation after save
  - Display success toast
  - Reset form or keep data based on user preference
  - _Requirements: 12.5_

- [ ]* 14.5 Write unit tests for loading states
  - Test skeletons show during loading
  - Test save button shows spinner
  - Test inputs disable during save
  - Test success animation plays after save

- [ ] 15. Implement responsive design
- [ ] 15.1 Add responsive statistics grid
  - Use 2 columns on mobile
  - Use 4 columns on tablet and desktop
  - _Requirements: 13.4_

- [ ]* 15.2 Write property test for responsive stats grid
  - **Property 19: Responsive Stats Grid**
  - **Validates: Requirements 13.4**

- [ ] 15.3 Implement bottom sheet for mobile quick actions
  - Show quick actions in bottom sheet on mobile (< 768px)
  - Show inline toolbar on desktop
  - _Requirements: 13.2_

- [ ]* 15.4 Write property test for bottom sheet
  - **Property 20: Bottom Sheet on Mobile**
  - **Validates: Requirements 13.2**

- [ ] 15.5 Add sticky header on mobile
  - Make configuration card sticky on mobile
  - Ensure it doesn't overlap content
  - _Requirements: 13.3_

- [ ] 15.6 Add fixed table header on desktop
  - Make table header sticky on scroll
  - Maintain column alignment
  - _Requirements: 13.5_

- [ ]* 15.7 Write unit tests for responsive design
  - Test stats grid uses correct columns
  - Test bottom sheet shows on mobile
  - Test sticky header works on mobile
  - Test fixed table header works on desktop

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement accessibility features
- [ ] 17.1 Add ARIA labels to all inputs
  - Add aria-label to score inputs
  - Add aria-label to select dropdowns
  - Add aria-label to buttons
  - _Requirements: 14.1_

- [ ]* 17.2 Write property test for ARIA labels
  - **Property 21: ARIA Labels Presence**
  - **Validates: Requirements 14.1**

- [ ] 17.3 Add table role to student list
  - Add role="table" to student list container
  - Add role="row" to each student item
  - Add role="cell" to each data cell
  - _Requirements: 14.2_

- [ ] 17.4 Add visible focus rings
  - Apply `ring-2 ring-indigo-500` on focus
  - Ensure focus rings are visible in all themes
  - Test focus order is logical
  - _Requirements: 14.3_

- [ ]* 17.5 Write property test for focus rings
  - **Property 22: Focus Ring Visibility**
  - **Validates: Requirements 14.3**

- [ ] 17.6 Add screen reader announcements
  - Add aria-live region for errors
  - Add aria-live region for success messages
  - Announce validation errors
  - Announce save success/failure
  - _Requirements: 14.4, 14.5_

- [ ]* 17.7 Write property test for screen reader announcements
  - **Property 23: Screen Reader Announcements**
  - **Validates: Requirements 14.4, 14.5**

- [ ]* 17.8 Write unit tests for accessibility
  - Test all inputs have aria-labels
  - Test table has correct roles
  - Test focus rings are visible
  - Test aria-live regions announce messages
  - Run axe-core accessibility audit

- [ ] 18. Implement performance optimizations
- [ ] 18.1 Add lazy loading for avatar images
  - Use loading="lazy" attribute
  - Add placeholder while loading
  - _Requirements: 15.3_

- [ ]* 18.2 Write property test for lazy loading
  - **Property 26: Lazy Image Loading**
  - **Validates: Requirements 15.3**

- [ ] 18.3 Implement optimistic UI updates
  - Update UI immediately on save
  - Rollback if save fails
  - Show loading indicator during server request
  - _Requirements: 15.4_

- [ ]* 18.4 Write property test for optimistic updates
  - **Property 27: Optimistic UI Updates**
  - **Validates: Requirements 15.4**

- [ ] 18.5 Configure React Query caching
  - Set staleTime and cacheTime
  - Enable background refetching
  - Implement cache invalidation on save
  - _Requirements: 15.5_

- [ ]* 18.6 Write property test for data caching
  - **Property 28: Data Caching**
  - **Validates: Requirements 15.5**

- [ ]* 18.7 Write unit tests for performance optimizations
  - Test images load lazily
  - Test optimistic updates work correctly
  - Test cache prevents redundant fetches
  - Run Lighthouse performance audit

- [ ] 19. Integrate all components into main page
- [ ] 19.1 Update BulkGradeInputPage component
  - Import all new components
  - Wire up state management
  - Connect to React Query hooks
  - Implement data flow between components
  - _Requirements: All requirements_

- [ ] 19.2 Add consistent styling from design system
  - Apply glass-card styling to all cards
  - Use indigo-purple gradient consistently
  - Apply spacing scale (p-4, p-6, gap-4, gap-6)
  - Use typography scale (text-3xl for h1, text-sm for description)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 19.3 Test complete user workflow
  - Test: Select class → Fill grades → Save
  - Test: Import Excel → Preview → Confirm → Save
  - Test: Export template → Download
  - Test: Fill grades → Leave page → Return → Restore draft
  - Test: Use keyboard only → Navigate → Save with Ctrl+S
  - _Requirements: All requirements_

- [ ]* 19.4 Write integration tests for complete workflows
  - Test end-to-end grade input workflow
  - Test end-to-end import workflow
  - Test end-to-end export workflow
  - Test end-to-end autosave workflow
  - Test end-to-end keyboard navigation workflow

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Polish and cleanup
- [ ] 21.1 Review and refactor code
  - Remove console.logs
  - Add JSDoc comments
  - Ensure consistent naming
  - Remove unused imports
  - _Requirements: All requirements_

- [ ] 21.2 Verify design system consistency
  - Check all components use design tokens
  - Verify spacing is consistent
  - Verify colors match design system
  - Verify typography is consistent
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 21.3 Test on different devices and browsers
  - Test on mobile (iOS Safari, Chrome)
  - Test on tablet (iPad, Android)
  - Test on desktop (Chrome, Firefox, Safari, Edge)
  - Test dark mode on all devices
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 21.4 Run final accessibility audit
  - Run axe-core automated tests
  - Test with keyboard only
  - Test with screen reader (NVDA/JAWS)
  - Verify WCAG AA compliance
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 21.5 Run final performance audit
  - Run Lighthouse audit
  - Check bundle size
  - Verify virtualization works for large lists
  - Check for memory leaks
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 22. Documentation and deployment
- [ ] 22.1 Update component documentation
  - Document all new components
  - Add usage examples
  - Document props and types
  - Add screenshots
  - _Requirements: All requirements_

- [ ] 22.2 Update user guide
  - Document new features (import/export, keyboard shortcuts)
  - Add troubleshooting section
  - Create video tutorial (optional)
  - _Requirements: All requirements_

- [ ] 22.3 Create migration guide
  - Document breaking changes (if any)
  - Provide migration steps
  - Document new features
  - _Requirements: All requirements_

- [ ] 22.4 Deploy to production
  - Merge feature branch to main
  - Run CI/CD pipeline
  - Monitor for errors
  - Gather user feedback
  - _Requirements: All requirements_
