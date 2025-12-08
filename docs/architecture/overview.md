# Portal Guru - System Architecture Overview

## Introduction

Portal Guru is a Progressive Web Application (PWA) designed to help Indonesian teachers manage their classroom activities, including student management, attendance tracking, academic records, and parent communication. This document provides a comprehensive overview of the system architecture.

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 18.x |
| **Build Tool** | Vite | 5.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **State Management** | TanStack Query | 5.x |
| **Backend** | Supabase | Latest |
| **Database** | PostgreSQL | 15.x |
| **AI Integration** | Google Gemini | Latest |
| **PDF Generation** | jsPDF | 2.x |
| **PWA** | Vite PWA Plugin | 0.17.x |

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        PWA[Progressive Web App]
        SW[Service Worker]
        IDB[(IndexedDB)]
    end
    
    subgraph "API Layer"
        SB[Supabase Client]
        RQ[React Query Cache]
    end
    
    subgraph "Backend Services"
        AUTH[Supabase Auth]
        DB[(PostgreSQL)]
        STORAGE[Supabase Storage]
        RLS[Row Level Security]
    end
    
    subgraph "External Services"
        GEMINI[Google Gemini AI]
    end
    
    PWA --> SB
    PWA --> RQ
    SW --> IDB
    SB --> AUTH
    SB --> DB
    SB --> STORAGE
    DB --> RLS
    PWA -.-> GEMINI
```

## Component Architecture

### Frontend Structure

```
src/
├── components/
│   ├── pages/           # Page components (routed)
│   ├── ui/              # Reusable UI components
│   ├── skeletons/       # Loading state components
│   └── AdvancedFeatures.tsx  # Feature components
├── hooks/               # Custom React hooks
├── services/            # API and business logic
├── contexts/            # React context providers
├── utils/               # Utility functions
└── workers/             # Web Workers
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `AuthProvider` | Manages user authentication state |
| `ThemeProvider` | Handles dark/light theme switching |
| `ToastProvider` | Displays notification toasts |
| `UndoToastProvider` | Manages undo functionality |
| `Layout` | Main application layout with navigation |

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as React Component
    participant RQ as React Query
    participant SB as Supabase Client
    participant DB as PostgreSQL
    
    U->>C: User Action
    C->>RQ: Mutation/Query
    RQ->>SB: API Request
    SB->>DB: SQL Query (with RLS)
    DB-->>SB: Query Result
    SB-->>RQ: Response Data
    RQ-->>C: Updated State
    C-->>U: UI Update
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as React App
    participant Auth as Supabase Auth
    participant DB as PostgreSQL
    
    U->>App: Login Request
    App->>Auth: signInWithPassword()
    Auth->>Auth: Validate Credentials
    Auth-->>App: Session Token
    App->>App: Store Session
    App->>DB: Fetch User Data (with RLS)
    DB-->>App: User Profile
    App-->>U: Redirect to Dashboard
```

## Offline Sync Strategy

Portal Guru implements an offline-first approach:

1. **Service Worker**: Caches static assets and API responses
2. **IndexedDB**: Stores offline mutations in a queue
3. **Sync Queue**: Processes pending mutations when online
4. **React Query**: Provides optimistic updates and cache invalidation

```mermaid
graph LR
    A[User Action] --> B{Online?}
    B -->|Yes| C[Direct API Call]
    B -->|No| D[Queue to IndexedDB]
    D --> E[Service Worker]
    E -->|Online Event| F[Process Queue]
    F --> C
    C --> G[Update Cache]
```

## Security Architecture

### Row Level Security (RLS)

All database tables are protected by Row Level Security policies:

```sql
-- Example RLS Policy for students table
CREATE POLICY "Users can only see their own students"
ON students FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can only insert their own students"
ON students FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### Authentication

- **Method**: Email/Password authentication via Supabase Auth
- **Session**: JWT tokens with automatic refresh
- **Storage**: Secure session storage in browser

### Data Protection

- All API calls require valid authentication
- Sensitive data is encrypted in transit (HTTPS)
- User data is isolated at the database level via RLS

## Performance Optimizations

1. **Code Splitting**: Lazy loading of page components
2. **React Query Caching**: Intelligent cache with stale-while-revalidate
3. **Optimistic Updates**: Immediate UI feedback
4. **PWA Caching**: Offline-first with service worker
5. **Image Optimization**: Lazy loading and compression

## Error Handling

```mermaid
graph TD
    A[Error Occurs] --> B{Error Type}
    B -->|Network| C[Offline Queue]
    B -->|Auth| D[Redirect to Login]
    B -->|Validation| E[Show Form Error]
    B -->|Server| F[Show Toast Notification]
    C --> G[Retry When Online]
    D --> H[Clear Session]
    E --> I[Highlight Field]
    F --> J[Log to Console]
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "CI/CD"
        GH[GitHub Actions]
    end
    
    subgraph "Hosting"
        VERCEL[Vercel/Netlify]
    end
    
    subgraph "Backend"
        SB_CLOUD[Supabase Cloud]
    end
    
    GH -->|Build & Deploy| VERCEL
    VERCEL -->|API Calls| SB_CLOUD
```

## Related Documentation

- [Data Flow Architecture](./data-flow.md)
- [Security Architecture](./security.md)
- [Offline Sync Strategy](./offline-sync.md)
- [Deployment Guide](../guides/deployment.md)
