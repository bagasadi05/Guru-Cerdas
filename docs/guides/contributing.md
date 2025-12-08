# Contributing to Portal Guru

Terima kasih atas minat Anda untuk berkontribusi ke Portal Guru! Dokumen ini menjelaskan panduan dan prosedur untuk berkontribusi ke proyek ini.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style Guidelines](#code-style-guidelines)
4. [Git Workflow](#git-workflow)
5. [Pull Request Process](#pull-request-process)
6. [Testing Requirements](#testing-requirements)

---

## Getting Started

### Prerequisites

Pastikan Anda memiliki tools berikut terinstall:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** >= 2.40.0
- **VS Code** (recommended) dengan extensions:
  - ESLint
  - Prettier
  - TypeScript + JavaScript
  - Tailwind CSS IntelliSense

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/portal-guru.git
cd portal-guru

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

---

## Development Setup

### Environment Variables

Buat file `.env.local` dengan variabel berikut:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: AI Features
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run test` | Run tests |
| `npm run storybook` | Start Storybook |
| `npm run typecheck` | Run TypeScript check |

### Project Structure

```
portal-guru/
├── src/
│   ├── components/     # React components
│   │   ├── pages/      # Page components
│   │   ├── ui/         # Reusable UI components
│   │   └── skeletons/  # Loading states
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and business logic
│   ├── contexts/       # React contexts
│   ├── utils/          # Utility functions
│   └── workers/        # Web Workers
├── docs/               # Documentation
├── public/             # Static assets
└── tests/              # Test files
```

---

## Code Style Guidelines

### TypeScript

- Gunakan **strict mode** TypeScript
- Selalu definisikan types untuk props dan return values
- Hindari `any` - gunakan `unknown` jika type tidak diketahui
- Gunakan interface untuk object shapes, type untuk unions

```typescript
// ✅ Good
interface StudentProps {
    id: string;
    name: string;
    classId: string | null;
}

// ❌ Bad
const student: any = { ... };
```

### React Components

- Gunakan **functional components** dengan hooks
- Gunakan **named exports** untuk components
- Tambahkan **JSDoc** untuk public components

```typescript
/**
 * Displays a student card with basic information
 *
 * @param props - Component props
 * @param props.student - Student data to display
 * @param props.onClick - Optional click handler
 */
export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
    // Implementation
};
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `StudentCard.tsx` |
| Hooks | camelCase with `use` prefix | `useStudents.ts` |
| Services | camelCase | `gamificationService.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `StudentData` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

### CSS/Tailwind

- Gunakan Tailwind CSS utility classes
- Untuk komponen kompleks, gunakan `@apply` di CSS modules
- Consistent spacing dan color palette

```tsx
// ✅ Good
<div className="flex items-center gap-4 p-4 rounded-lg bg-white dark:bg-gray-800">

// ❌ Bad - inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

---

## Git Workflow

### Branch Naming

```
feature/[ticket-id]-short-description
bugfix/[ticket-id]-short-description
hotfix/[ticket-id]-short-description
docs/short-description
```

Examples:
- `feature/PG-123-add-student-export`
- `bugfix/PG-456-fix-attendance-sync`
- `docs/update-api-documentation`

### Commit Messages

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: Fitur baru
- `fix`: Bug fix
- `docs`: Dokumentasi
- `style`: Formatting (no code change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(students): add bulk export functionality

- Added export to Excel feature
- Added export to CSV feature
- Updated UI with export button

Closes #123
```

```
fix(attendance): resolve sync issue when offline

The attendance sync was failing silently when the device
went offline during the sync process.

Fixes #456
```

---

## Pull Request Process

### Before Submitting

1. ✅ Pastikan semua tests pass: `npm run test`
2. ✅ Pastikan tidak ada lint errors: `npm run lint`
3. ✅ Pastikan TypeScript compiles: `npm run typecheck`
4. ✅ Test manual di browser
5. ✅ Update dokumentasi jika diperlukan

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Added JSDoc for new functions
- [ ] Updated documentation
- [ ] Added tests for new features
```

### Review Process

1. Submit PR ke branch `develop`
2. Automated checks akan berjalan (lint, test, build)
3. Request review dari minimal 1 maintainer
4. Address feedback dan update PR
5. Maintainer akan merge setelah approval

---

## Testing Requirements

### Unit Tests

Gunakan Vitest untuk unit testing:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateStudentPoints } from './gamificationService';

describe('calculateStudentPoints', () => {
    it('should return 0 for average score below 70', () => {
        const result = calculateStudentPoints({
            averageScore: 60,
            attendanceRate: 100,
            quizPoints: 0,
            violationCount: 0,
        });
        expect(result).toBeGreaterThanOrEqual(0);
    });
});
```

### Property-Based Tests

Gunakan fast-check untuk property testing:

```typescript
import * as fc from 'fast-check';

describe('Student points calculation', () => {
    it('should never return negative points', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 100 }),
                fc.integer({ min: 0, max: 100 }),
                (score, attendance) => {
                    const result = calculateStudentPoints({ ... });
                    return result >= 0;
                }
            )
        );
    });
});
```

### Test Coverage

Target coverage: **80%** untuk:
- Services
- Hooks
- Utility functions

---

## Questions?

Jika ada pertanyaan, silakan:
- Buat issue di GitHub
- Hubungi maintainer via email
- Join Discord community (jika ada)

Terima kasih telah berkontribusi ke Portal Guru! 🙏
