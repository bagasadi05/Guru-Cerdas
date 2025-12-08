# API Documentation

This directory contains API documentation for Portal Guru.

## Overview

Portal Guru's API is organized into several layers:

### Services (`src/services/`)

Business logic and external API integrations:

| Service | Description |
|---------|-------------|
| `supabase` | Supabase client configuration |
| `gamificationService` | Badge and leaderboard logic |
| `pdfGenerator` | PDF report generation |
| `backupService` | Data backup and restore |
| `offlineQueue` | Offline mutation queue |
| `SoftDeleteService` | Soft delete operations |
| `UndoManager` | Undo functionality |
| `ExportService` | Data export (PDF, Excel, CSV) |
| `CleanupService` | Scheduled cleanup jobs |

### Hooks (`src/hooks/`)

Custom React hooks for state management:

| Hook | Description |
|------|-------------|
| `useAuth` | Authentication state and operations |
| `useOfflineStatus` | Online/offline detection |
| `useSyncQueue` | Offline sync queue processing |
| `useTheme` | Theme switching (dark/light) |
| `useToast` | Toast notifications |
| `useSoftDelete` | Soft delete with undo |
| `useExport` | Export functionality |

### Utilities (`src/utils/`)

Pure utility functions:

| Utility | Description |
|---------|-------------|
| `validation` | Form validation helpers |
| `exportUtils` | Export formatting utilities |
| `accessibility` | Accessibility helpers |
| `performance` | Performance utilities |

## Generating API Documentation

To generate detailed API documentation with TypeDoc:

```bash
# Install TypeDoc (if not installed)
npm install -D typedoc

# Generate documentation
npm run docs:api
```

This will output HTML documentation to `docs/api/generated/`.

## Database API

For database schema and queries, see:

- [Database Tables](./database/tables.md)
- [Database Functions](./database/functions.md)
- [Database Types](./database/types.md)

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Getting Started](../guides/getting-started.md)
