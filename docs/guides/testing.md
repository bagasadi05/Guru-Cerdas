# Testing Guide

Panduan ini menjelaskan strategi testing dan cara menulis test untuk Portal Guru.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Testing Tools](#testing-tools)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Property-Based Testing](#property-based-testing)
6. [Integration Testing](#integration-testing)
7. [Component Testing](#component-testing)
8. [Best Practices](#best-practices)

---

## Testing Strategy

### Testing Pyramid

```
       /\
      /  \      E2E Tests
     /----\     (minimal)
    /      \    
   /--------\   Integration Tests
  /          \  (moderate)
 /------------\ Unit Tests
/              \ (extensive)
```

| Level | Scope | Speed | Quantity |
|-------|-------|-------|----------|
| Unit | Single function/hook | Fast | Many |
| Integration | Multiple components | Medium | Some |
| E2E | Full user flow | Slow | Few |

### What to Test

| Layer | What to Test | Priority |
|-------|--------------|----------|
| Services | Business logic, API calls | High |
| Hooks | State management, side effects | High |
| Utils | Pure functions | High |
| Components | User interactions, rendering | Medium |
| Pages | Integration, routing | Low |

---

## Testing Tools

### Installed Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (Jest-compatible) |
| **@testing-library/react** | React component testing |
| **fast-check** | Property-based testing |
| **MSW** | API mocking |

### Installation

Tools sudah terinstall. Jika perlu manual:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom fast-check msw
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- src/services/gamificationService.test.ts

# Run matching pattern
npm run test -- --grep "calculate"
```

### Configuration

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Unit Testing

### Testing Pure Functions

```typescript
// src/utils/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime } from './formatDate';

describe('formatDate', () => {
  it('should format date in Indonesian locale', () => {
    const date = new Date('2024-12-06');
    const result = formatDate(date);
    expect(result).toBe('6 Desember 2024');
  });

  it('should handle invalid date', () => {
    const result = formatDate(null);
    expect(result).toBe('-');
  });
});

describe('formatRelativeTime', () => {
  it('should return "Hari ini" for today', () => {
    const today = new Date();
    const result = formatRelativeTime(today);
    expect(result).toBe('Hari ini');
  });
});
```

### Testing Services

```typescript
// src/services/gamificationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateStudentPoints, getEarnedBadges, BADGES } from './gamificationService';

describe('calculateStudentPoints', () => {
  const baseStudentData = {
    studentId: '1',
    studentName: 'Test Student',
    classId: 'class-1',
    className: 'Class A',
    averageScore: 80,
    perfectScoreCount: 0,
    attendanceRate: 100,
    quizPoints: 0,
    violationCount: 0,
  };

  it('should calculate points from average score', () => {
    const data = { ...baseStudentData, averageScore: 90 };
    const points = calculateStudentPoints(data);
    
    // (90-70) * 2 = 40 from grades
    // 100% attendance = 30
    // Total = 70
    expect(points).toBe(70);
  });

  it('should deduct points for violations', () => {
    const withViolation = { ...baseStudentData, violationCount: 2 };
    const withoutViolation = { ...baseStudentData, violationCount: 0 };
    
    const pointsWith = calculateStudentPoints(withViolation);
    const pointsWithout = calculateStudentPoints(withoutViolation);
    
    expect(pointsWithout - pointsWith).toBe(10); // 2 * 5 = 10 points deducted
  });

  it('should never return negative points', () => {
    const data = { ...baseStudentData, violationCount: 100 };
    const points = calculateStudentPoints(data);
    expect(points).toBeGreaterThanOrEqual(0);
  });
});
```

### Testing with Mocks

```typescript
// src/services/backupService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportBackup } from './backupService';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('exportBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a Blob with backup data', async () => {
    const result = await exportBackup('user-123');
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/json');
  });
});
```

---

## Property-Based Testing

Property-based testing verifies that properties/invariants always hold true across many random inputs.

### When to Use

- ✅ Mathematical calculations
- ✅ Data transformations
- ✅ Validation functions
- ✅ Serialization/deserialization
- ❌ UI interactions
- ❌ External API calls

### Basic Example

```typescript
// src/services/gamificationService.property.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateStudentPoints } from './gamificationService';

describe('Property-based tests for gamification', () => {
  // Property 1: Points are never negative
  it('should never return negative points for any input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // averageScore
        fc.integer({ min: 0, max: 100 }), // attendanceRate
        fc.integer({ min: 0, max: 1000 }), // quizPoints
        fc.integer({ min: 0, max: 100 }), // violationCount
        (averageScore, attendanceRate, quizPoints, violationCount) => {
          const data = {
            studentId: '1',
            studentName: 'Test',
            classId: 'class-1',
            className: 'Class',
            averageScore,
            perfectScoreCount: 0,
            attendanceRate,
            quizPoints,
            violationCount,
          };
          
          const points = calculateStudentPoints(data);
          return points >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Higher average score = more points (when other factors equal)
  it('should award more points for higher scores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }), // lowScore
        fc.integer({ min: 51, max: 100 }), // highScore
        (lowScore, highScore) => {
          const baseData = {
            studentId: '1',
            studentName: 'Test',
            classId: 'class-1',
            className: 'Class',
            perfectScoreCount: 0,
            attendanceRate: 100,
            quizPoints: 0,
            violationCount: 0,
          };
          
          const lowPoints = calculateStudentPoints({ ...baseData, averageScore: lowScore });
          const highPoints = calculateStudentPoints({ ...baseData, averageScore: highScore });
          
          return highPoints >= lowPoints;
        }
      )
    );
  });

  // Property 3: Violations always decrease points
  it('should decrease points with more violations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 11, max: 20 }),
        (lessViolations, moreViolations) => {
          const baseData = {
            studentId: '1',
            studentName: 'Test',
            classId: 'class-1',
            className: 'Class',
            averageScore: 80,
            perfectScoreCount: 0,
            attendanceRate: 100,
            quizPoints: 50,
            violationCount: 0,
          };
          
          const lessPoints = calculateStudentPoints({ ...baseData, violationCount: lessViolations });
          const morePoints = calculateStudentPoints({ ...baseData, violationCount: moreViolations });
          
          return lessPoints >= morePoints;
        }
      )
    );
  });
});
```

### Advanced Property Testing

```typescript
// Testing data transformation roundtrip
describe('Data serialization properties', () => {
  it('should preserve data through export/import cycle', () => {
    const studentArbitrary = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      class_id: fc.uuid(),
      gender: fc.constantFrom('Laki-laki', 'Perempuan'),
    });

    fc.assert(
      fc.property(fc.array(studentArbitrary), (students) => {
        const exported = JSON.stringify(students);
        const imported = JSON.parse(exported);
        
        return JSON.stringify(imported) === exported;
      })
    );
  });
});
```

---

## Integration Testing

### Testing Hook + Service Integration

```typescript
// src/hooks/useStudents.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStudents } from './useStudents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStudents', () => {
  it('should fetch students successfully', async () => {
    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Testing Complete Flow

```typescript
// src/tests/integration/deleteUndo.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { recordAction, undo, canUndo } from '../services/UndoManager';
import { softDelete, restore } from '../services/SoftDeleteService';

describe('Delete-Undo Integration', () => {
  it('should complete delete and undo cycle', async () => {
    // 1. Soft delete a record
    const deleteResult = await softDelete('students', 'test-id');
    expect(deleteResult.success).toBe(true);

    // 2. Record the action
    const action = await recordAction(
      'user-1',
      'delete',
      'students',
      ['test-id']
    );
    expect(action.id).toBeDefined();

    // 3. Verify can undo
    expect(canUndo(action.id)).toBe(true);

    // 4. Perform undo
    const undoResult = await undo(action.id);
    expect(undoResult.success).toBe(true);

    // 5. Verify cannot undo again
    expect(canUndo(action.id)).toBe(false);
  });
});
```

---

## Component Testing

### Basic Component Test

```typescript
// src/components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('should apply variant styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByText('Delete');
    expect(button).toHaveClass('bg-red-500');
  });
});
```

### Testing with User Events

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('should debounce input', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    
    render(<SearchInput onSearch={onSearch} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'test');
    
    // Should not be called immediately
    expect(onSearch).not.toHaveBeenCalled();
    
    // Wait for debounce
    await new Promise(r => setTimeout(r, 350));
    
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
```

---

## Best Practices

### General Guidelines

1. **Test behavior, not implementation**
   ```typescript
   // ❌ Bad - testing implementation
   expect(component.state.isLoading).toBe(true);
   
   // ✅ Good - testing behavior
   expect(screen.getByText('Loading...')).toBeInTheDocument();
   ```

2. **Use descriptive test names**
   ```typescript
   // ❌ Bad
   it('test 1', () => {});
   
   // ✅ Good
   it('should return 0 points when average score is below 70', () => {});
   ```

3. **One assertion per test (when possible)**
   ```typescript
   // ❌ Bad
   it('should work', () => {
     expect(a).toBe(1);
     expect(b).toBe(2);
     expect(c).toBe(3);
   });
   
   // ✅ Good
   it('should set a to 1', () => expect(a).toBe(1));
   it('should set b to 2', () => expect(b).toBe(2));
   ```

4. **Arrange-Act-Assert pattern**
   ```typescript
   it('should calculate total correctly', () => {
     // Arrange
     const items = [{ price: 10 }, { price: 20 }];
     
     // Act
     const total = calculateTotal(items);
     
     // Assert
     expect(total).toBe(30);
   });
   ```

### Coverage Targets

| Directory | Target Coverage |
|-----------|-----------------|
| `src/services/` | 80% |
| `src/hooks/` | 80% |
| `src/utils/` | 90% |
| `src/components/ui/` | 70% |

---

## Related Documentation

- [Contributing Guide](./contributing.md)
- [Architecture Overview](../architecture/overview.md)
- [API Documentation](../api/)
