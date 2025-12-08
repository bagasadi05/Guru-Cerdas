# Design Document: Bug Fixes and Missing Features

## Overview

This design document outlines the technical approach for fixing critical bugs and implementing missing features in Portal Guru. The implementation will be done incrementally, prioritizing critical bug fixes first, followed by high-impact features that improve user experience and system reliability.

The design follows these principles:
- **Minimal disruption**: Fix bugs without breaking existing functionality
- **Incremental delivery**: Implement features in small, testable chunks
- **Type safety**: Leverage TypeScript for compile-time error detection
- **Performance**: Optimize for fast load times and smooth interactions
- **Accessibility**: Ensure WCAG 2.1 Level AA compliance
- **Testability**: Design components and services to be easily testable

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │  Hooks   │  │  Context │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Validation│  │  Export  │  │  Backup  │  │  Search  │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                       Data Access Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Supabase │  │  Query   │  │ Offline  │  │  Logger  │   │
│  │  Client  │  │  Client  │  │  Queue   │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

The application follows a modular component structure:

```
src/
├── components/
│   ├── pages/           # Page-level components
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form components with validation
│   ├── skeletons/       # Loading skeleton screens
│   └── modals/          # Modal dialogs
├── hooks/               # Custom React hooks
├── services/            # Business logic services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── contexts/            # React contexts
```

## Components and Interfaces

### 1. Type Definitions (src/types/index.ts)

```typescript
// Core database types
export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];
export type AttendanceRow = Database['public']['Tables']['attendance']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type ScheduleRow = Database['public']['Tables']['schedules']['Row'];
export type AcademicRecordRow = Database['public']['Tables']['academic_records']['Row'];
export type ViolationRow = Database['public']['Tables']['violations']['Row'];

// Enums
export enum AttendanceStatus {
  Hadir = 'Hadir',
  Izin = 'Izin',
  Sakit = 'Sakit',
  Alpha = 'Alpha',
}

export enum TaskStatus {
  todo = 'todo',
  in_progress = 'in_progress',
  done = 'done',
}

// Composite types
export type StudentWithClass = StudentRow & { 
  classes: Pick<ClassRow, 'name'> | null 
};

export type AttendanceRecord = {
  id?: string;
  status: AttendanceStatus;
  note: string;
};

// Validation types
export type ValidationRule = {
  validate: (value: any) => boolean;
  message: string;
};

export type ValidationRules = Record<string, ValidationRule[]>;

// Export types
export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ExportColumn = {
  key: string;
  label: string;
  selected: boolean;
};

// Search types
export type SearchResult = {
  id: string;
  type: 'student' | 'class' | 'attendance' | 'task';
  title: string;
  subtitle: string;
  metadata?: Record<string, any>;
};

// Backup types
export type BackupData = {
  version: string;
  timestamp: string;
  students: StudentRow[];
  classes: ClassRow[];
  attendance: AttendanceRow[];
  tasks: TaskRow[];
  schedules: ScheduleRow[];
  academic_records: AcademicRecordRow[];
  violations: ViolationRow[];
};
```

### 2. Validation Service (src/services/ValidationService.ts)

```typescript
interface ValidationService {
  // Validate a single field
  validateField(value: any, rules: ValidationRule[]): ValidationResult;
  
  // Validate entire form
  validateForm(values: Record<string, any>, rules: ValidationRules): FormValidationResult;
  
  // Pre-built validators
  validators: {
    required(message?: string): ValidationRule;
    minLength(length: number, message?: string): ValidationRule;
    maxLength(length: number, message?: string): ValidationRule;
    email(message?: string): ValidationRule;
    phoneNumber(message?: string): ValidationRule;
    number(message?: string): ValidationRule;
    alphanumeric(message?: string): ValidationRule;
    url(message?: string): ValidationRule;
  };
}

type ValidationResult = {
  isValid: boolean;
  error?: string;
};

type FormValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};
```

### 3. Export Service (src/services/ExportService.ts)

```typescript
interface ExportService {
  // Export data to specified format
  exportData(
    data: any[],
    format: ExportFormat,
    columns: ExportColumn[],
    filename: string
  ): Promise<void>;
  
  // Export to PDF
  exportToPDF(data: any[], columns: ExportColumn[], filename: string): Promise<void>;
  
  // Export to Excel
  exportToExcel(data: any[], columns: ExportColumn[], filename: string): Promise<void>;
  
  // Export to CSV
  exportToCSV(data: any[], columns: ExportColumn[], filename: string): Promise<void>;
}
```

### 4. Backup Service (src/services/BackupService.ts)

```typescript
interface BackupService {
  // Create backup of all user data
  createBackup(userId: string): Promise<BackupData>;
  
  // Validate backup file
  validateBackup(file: File): Promise<ValidationResult>;
  
  // Restore from backup
  restoreBackup(
    backup: BackupData,
    mode: 'merge' | 'replace'
  ): Promise<RestoreResult>;
  
  // Download backup as JSON file
  downloadBackup(backup: BackupData): void;
}

type RestoreResult = {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};
```

### 5. Search Service (src/services/SearchService.ts)

```typescript
interface SearchService {
  // Global search across all entities
  search(query: string, userId: string): Promise<SearchResult[]>;
  
  // Search specific entity type
  searchStudents(query: string, userId: string): Promise<SearchResult[]>;
  searchClasses(query: string, userId: string): Promise<SearchResult[]>;
  searchAttendance(query: string, userId: string): Promise<SearchResult[]>;
  searchTasks(query: string, userId: string): Promise<SearchResult[]>;
  
  // Apply filters
  applyFilters(
    data: any[],
    filters: Record<string, any>
  ): any[];
}
```

### 6. Offline Queue Service (src/services/OfflineQueueService.ts)

```typescript
interface OfflineQueueService {
  // Add action to queue
  enqueue(action: QueuedAction): Promise<void>;
  
  // Process queue when online
  processQueue(): Promise<ProcessResult>;
  
  // Retry failed action
  retryAction(actionId: string): Promise<void>;
  
  // Get queue status
  getQueueStatus(): QueueStatus;
  
  // Clear queue
  clearQueue(): Promise<void>;
}

type QueuedAction = {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  payload: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed' | 'success';
};

type ProcessResult = {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ actionId: string; error: string }>;
};

type QueueStatus = {
  total: number;
  pending: number;
  processing: number;
  failed: number;
};
```

### 7. Logger Service (src/services/LoggerService.ts)

```typescript
interface LoggerService {
  // Log methods
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
  
  // Performance logging
  logPerformance(metric: PerformanceMetric): void;
  
  // Send logs to monitoring service
  flush(): Promise<void>;
}

type LogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  component?: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
};

type PerformanceMetric = {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
};
```

## Data Models

### Enhanced Database Schema

The existing database schema will be extended with the following:

```sql
-- Add deleted_at column for soft delete (if not exists)
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Add gamification tables
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add messaging table for parent-teacher communication
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  push_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT FALSE,
  task_reminders BOOLEAN DEFAULT TRUE,
  attendance_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, here are the key correctness properties that will be tested:

### Property 1: Error Handling Completeness
*For any* component that throws an error, the error should be caught and a user-friendly message should be displayed.
**Validates: Requirements 3.1**

### Property 2: Network Error Logging
*For any* network request that fails, the error log should contain the request URL, method, and error message.
**Validates: Requirements 3.2**

### Property 3: Error Log Structure
*For any* error that is logged, the log entry should include timestamp, error level, component name, and stack trace.
**Validates: Requirements 3.4**

### Property 4: Invalid Form Field Display
*For any* form field containing invalid data, the system should display an error message below the field with a red border.
**Validates: Requirements 4.2**

### Property 5: Valid Form Field Display
*For any* form field containing valid data, the system should display a green checkmark icon.
**Validates: Requirements 4.3**

### Property 6: Form Submission Prevention
*For any* form with invalid data, submitting the form should be prevented and all invalid fields should be highlighted.
**Validates: Requirements 4.4**

### Property 7: Skeleton Screen Display
*For any* page that is loading data, a skeleton screen matching the page layout should be displayed.
**Validates: Requirements 5.1**

### Property 8: Export Column Selection
*For any* export operation with selected columns, the generated file should contain only the selected columns.
**Validates: Requirements 6.3**

### Property 9: Export Error Messages
*For any* export operation that fails, an error message with the failure reason should be displayed.
**Validates: Requirements 6.7**

### Property 10: Offline Action Queuing
*For any* action performed while offline, the action should be added to the synchronization queue.
**Validates: Requirements 7.2**

### Property 11: Sync Retry Logic
*For any* sync operation that fails, the system should retry up to 3 times with exponential backoff.
**Validates: Requirements 7.6**

### Property 12: Bulk Delete Confirmation
*For any* bulk delete operation, all selected items should be deleted after user confirmation.
**Validates: Requirements 8.4**

### Property 13: Bulk Export Completeness
*For any* bulk export operation, the exported data should contain all selected items.
**Validates: Requirements 8.5**

### Property 14: Bulk Code Generation Uniqueness
*For any* bulk access code generation, all generated codes should be unique and only generated for students without existing codes.
**Validates: Requirements 8.6**

### Property 15: Backup Data Completeness
*For any* backup operation, the backup file should include all required data types (students, classes, attendance, tasks, schedules, academic records, violations).
**Validates: Requirements 9.2**

### Property 16: Backup File Validation
*For any* invalid backup file uploaded, the validation should reject the file with an appropriate error message.
**Validates: Requirements 9.4**

### Property 17: Global Search Scope
*For any* search query, results should include matches from students, classes, attendance, and tasks.
**Validates: Requirements 10.1**

### Property 18: Search Result Grouping
*For any* search results displayed, results should be grouped by type with appropriate icons.
**Validates: Requirements 10.2**

### Property 19: Search Result Navigation
*For any* search result clicked, the system should navigate to the relevant page.
**Validates: Requirements 10.3**

### Property 20: Filter URL Synchronization
*For any* filters applied, the URL query parameters should be updated to reflect the active filters.
**Validates: Requirements 10.6**

### Property 21: Password Complexity Validation
*For any* password entered during login, the system should enforce complexity requirements (minimum 8 characters, 1 uppercase, 1 number).
**Validates: Requirements 16.1**

### Property 22: Access Code Hashing
*For any* access code stored in the database, the code should be hashed before storage.
**Validates: Requirements 16.4**

### Property 23: CSRF Token Inclusion
*For any* state-changing API request, the request should include a CSRF token.
**Validates: Requirements 16.6**

### Property 24: XSS Input Sanitization
*For any* user input processed, the input should be sanitized to prevent XSS attacks.
**Validates: Requirements 16.7**

### Property 25: Import File Validation
*For any* file uploaded for import, the system should validate the file format and column headers.
**Validates: Requirements 18.2**

### Property 26: Import Error Highlighting
*For any* invalid data in import preview, the invalid rows should be highlighted in red.
**Validates: Requirements 18.4**

### Property 27: Import Record Filtering
*For any* import operation, only valid records should be inserted and invalid records should be skipped.
**Validates: Requirements 18.5**

## Error Handling

### Error Handling Strategy

1. **Component-Level Error Boundaries**
   - Wrap each major page component in an ErrorBoundary
   - Display user-friendly error messages
   - Log errors to monitoring service
   - Provide recovery actions (retry, go back, etc.)

2. **Network Error Handling**
   - Implement retry logic with exponential backoff
   - Display offline banner when network is unavailable
   - Queue actions for later synchronization
   - Show clear error messages for failed requests

3. **Validation Errors**
   - Display inline error messages for form fields
   - Prevent form submission when validation fails
   - Highlight all invalid fields
   - Provide helpful error messages

4. **Logging Strategy**
   - Log all errors with full context
   - Include component name, user action, and stack trace
   - Send critical errors to monitoring service
   - Store logs locally for debugging

### Error Recovery

```typescript
// Example error recovery flow
try {
  await performAction();
} catch (error) {
  // Log error
  logger.error('Action failed', error, { component: 'ComponentName', action: 'actionName' });
  
  // Check if offline
  if (!navigator.onLine) {
    // Queue for later
    await offlineQueue.enqueue(action);
    toast.info('Action queued for synchronization');
  } else {
    // Retry with backoff
    const result = await retryWithBackoff(performAction, 3);
    if (!result.success) {
      // Show error to user
      toast.error('Action failed. Please try again.');
    }
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Utility functions (validation, formatting, calculations)
- Service methods (export, backup, search)
- Custom hooks (useFormValidation, useOfflineQueue)
- Pure components (UI components without side effects)

**Testing Framework**: Vitest
**Coverage Target**: 80% minimum

### Property-Based Testing

Property-based tests will verify universal properties using **fast-check** library:
- Each correctness property will have a corresponding property-based test
- Tests will generate at least 100 random test cases per property
- Tests will be tagged with the property number and requirement reference

**Example Property Test**:
```typescript
import fc from 'fast-check';

// Feature: bug-fixes-and-missing-features, Property 8: Export Column Selection
// Validates: Requirements 6.3
test('exported file contains only selected columns', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ name: fc.string(), age: fc.integer() })),
      fc.array(fc.constantFrom('name', 'age')),
      (data, selectedColumns) => {
        const exported = exportData(data, selectedColumns);
        const exportedKeys = Object.keys(exported[0] || {});
        return exportedKeys.every(key => selectedColumns.includes(key));
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will cover:
- API endpoints with Supabase
- Offline queue synchronization
- Export functionality end-to-end
- Backup and restore operations

### Component Testing

Component tests will verify:
- Component renders without errors
- User interactions work correctly
- Props are handled properly
- State updates correctly

**Testing Library**: @testing-library/react

### Accessibility Testing

Accessibility tests will verify:
- Keyboard navigation works
- Screen reader announcements are correct
- Focus management in modals
- ARIA attributes are present
- Color contrast meets WCAG standards

**Testing Tool**: @storybook/addon-a11y

## Performance Considerations

### Optimization Strategies

1. **Code Splitting**
   - Lazy load pages and heavy components
   - Split vendor bundles by usage frequency
   - Use dynamic imports for rarely-used features

2. **Data Fetching**
   - Implement pagination for large lists
   - Use TanStack Query for caching and deduplication
   - Prefetch data for likely next actions
   - Implement virtual scrolling for long lists

3. **Bundle Size**
   - Tree-shake unused code
   - Use lightweight alternatives where possible
   - Compress assets (images, fonts)
   - Monitor bundle size in CI/CD

4. **Runtime Performance**
   - Memoize expensive calculations
   - Debounce user input
   - Use Web Workers for heavy computations
   - Optimize re-renders with React.memo

### Performance Metrics

Monitor these Core Web Vitals:
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s

## Security Considerations

### Security Measures

1. **Authentication & Authorization**
   - Enforce strong password requirements
   - Implement account lockout after failed attempts
   - Use secure session management
   - Validate user permissions on all operations

2. **Data Protection**
   - Hash sensitive data (access codes, passwords)
   - Use HTTPS for all communications
   - Implement CSRF protection
   - Sanitize all user input

3. **API Security**
   - Use Row Level Security (RLS) in Supabase
   - Validate all input on server side
   - Rate limit API requests
   - Log security events

4. **Client-Side Security**
   - Prevent XSS attacks through input sanitization
   - Use Content Security Policy (CSP)
   - Avoid storing sensitive data in localStorage
   - Clear sensitive data on logout

## Deployment Strategy

### Phased Rollout

**Phase 1: Critical Bug Fixes (Week 1)**
- Fix TasksPage corruption
- Add missing type definitions
- Enhance error handling

**Phase 2: Core Features (Week 2-3)**
- Implement form validation
- Complete skeleton screens
- Enhance export functionality

**Phase 3: Offline & Sync (Week 4)**
- Improve offline functionality
- Enhance sync reliability
- Add bulk operations

**Phase 4: Data Management (Week 5)**
- Implement backup/restore
- Add data import
- Enhance search

**Phase 5: User Experience (Week 6-7)**
- Add parent portal enhancements
- Implement notifications
- Add analytics dashboard

**Phase 6: Polish & Testing (Week 8)**
- Accessibility improvements
- Performance optimization
- Security enhancements
- Comprehensive testing

### Rollback Plan

Each phase will have a rollback plan:
- Tag releases in git
- Keep previous version deployed
- Monitor error rates after deployment
- Automated rollback if error rate exceeds threshold

## Monitoring & Observability

### Metrics to Track

1. **Application Metrics**
   - Page load times
   - API response times
   - Error rates by component
   - User session duration

2. **Business Metrics**
   - Daily active users
   - Feature usage statistics
   - Export/import success rates
   - Offline sync success rates

3. **Performance Metrics**
   - Core Web Vitals
   - Bundle size
   - Cache hit rates
   - Database query performance

### Logging Strategy

- **Development**: Console logging with full details
- **Production**: Send logs to monitoring service (e.g., Sentry)
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Log Retention**: 30 days for production logs

## Documentation

### Developer Documentation

- API documentation using TypeDoc
- Component documentation using Storybook
- Architecture decision records (ADRs)
- Setup and deployment guides

### User Documentation

- Feature guides with screenshots
- Video tutorials for complex features
- FAQ section
- Troubleshooting guide

## Conclusion

This design provides a comprehensive approach to fixing bugs and implementing missing features in Portal Guru. The implementation will be done incrementally, with each phase building on the previous one. The focus is on maintaining code quality, ensuring type safety, and providing a great user experience while keeping the system performant and secure.

The correctness properties defined in this document will guide the testing strategy, ensuring that all critical behaviors are verified through property-based testing. This approach will help catch edge cases and ensure the system behaves correctly across all possible inputs.

