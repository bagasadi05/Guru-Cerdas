# Portal Guru Documentation

Selamat datang di dokumentasi Portal Guru! Dokumentasi ini berisi panduan lengkap untuk pengembang yang ingin berkontribusi atau mempelajari arsitektur aplikasi.

## 📚 Documentation Structure

```
docs/
├── api/                    # API & Database Documentation
│   └── database/
│       └── tables.md       # Database schema & queries
├── architecture/           # System Architecture
│   ├── overview.md         # High-level architecture
│   ├── data-flow.md        # Data flow patterns
│   ├── security.md         # Security architecture
│   └── offline-sync.md     # PWA offline strategy
├── guides/                 # Developer Guides
│   ├── getting-started.md  # Quick start guide
│   ├── contributing.md     # Contribution guidelines
│   ├── deployment.md       # Deployment instructions
│   ├── testing.md          # Testing strategies
│   └── troubleshooting.md  # Common issues & solutions
└── components/             # Component Documentation
    └── (Storybook)
```

## 🚀 Quick Links

### For New Developers

1. [Getting Started](./guides/getting-started.md) - Setup development environment
2. [Contributing Guide](./guides/contributing.md) - How to contribute
3. [Architecture Overview](./architecture/overview.md) - Understand the system

### For Understanding the Codebase

1. [Data Flow](./architecture/data-flow.md) - How data flows through the app
2. [Database Schema](./api/database/tables.md) - Database structure & queries
3. [Security Architecture](./architecture/security.md) - Authentication & authorization

### For Deployment & Maintenance

1. [Deployment Guide](./guides/deployment.md) - Production deployment
2. [Troubleshooting](./guides/troubleshooting.md) - Common issues
3. [Offline Sync](./architecture/offline-sync.md) - PWA functionality

### For Testing

1. [Testing Guide](./guides/testing.md) - Testing strategies & examples

## 🛠 Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| State Management | TanStack Query (React Query) |
| Backend | Supabase (PostgreSQL + Auth) |
| PWA | Vite PWA Plugin |
| PDF | jsPDF + autoTable |
| AI | Google Gemini |

## 📖 Additional Resources

### External Documentation

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

### Component Documentation

Component documentation is available via Storybook:

```bash
npm run storybook
```

### API Documentation

API documentation can be generated with TypeDoc:

```bash
npm run docs:api
```

## 🔄 Keeping Documentation Updated

When making changes to the codebase:

1. Update relevant documentation files
2. Add JSDoc comments to new functions/components
3. Update changelog if applicable
4. Create or update Storybook stories for UI components

## 📝 Documentation Status

| Section | Status |
|---------|--------|
| Architecture | ✅ Complete |
| Database Schema | ✅ Complete |
| Getting Started | ✅ Complete |
| Contributing | ✅ Complete |
| Deployment | ✅ Complete |
| Troubleshooting | ✅ Complete |
| Testing | ✅ Complete |
| API (TypeDoc) | 🔄 In Progress |
| Storybook | ✅ Set Up |

---

**Last Updated**: December 2024

**Maintainers**: Portal Guru Development Team
