# Teacher Corner 2.0

A full-stack **Learning Management System (LMS)** built for an education-focused NGO, connecting **teachers, mentors, students, and administrators** across multiple educational institutions. The platform manages classrooms, curricula, assignments, quizzes, contests, events, and real-time communications — all within a single, role-based Angular application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Angular 14 with TypeScript |
| **UI Library** | Angular Material 14 + TailwindCSS |
| **Backend** | Firebase (Firestore, Authentication, Cloud Functions, Hosting) |
| **State & Async** | RxJS 7, Apollo GraphQL |
| **Rich Text** | Quill Editor (ngx-quill) |
| **Charts** | ApexCharts (ng-apexcharts) |
| **PDF Generation** | jsPDF, jspdf-autotable, pdf-lib, pdfmake |
| **Other** | QR Code generation, YouTube Player, Skeleton Loaders, IndexedDB (offline support) |

## Architecture Overview

```
src/
├── @fuse/                     # Fuse UI framework (animations, components, directives, services)
├── app/
│   ├── core/                  # Auth guards, interceptors, 25+ Firestore DB services
│   ├── layout/                # App shell, navigation, toolbar, user menu
│   ├── modules/               # 45+ lazy-loaded feature modules (see below)
│   └── shared/                # Shared services, utilities, export/excel/upload helpers
├── assets/                    # Icons, images, logos, fonts
└── environments/              # Environment configs (excluded from repo — see setup)
```

## Feature Modules

### Authentication & Authorization
- **Phone + OTP login** via Firebase Auth and Exotel SMS
- **Role-Based Access Control (RBAC)** with 4 access levels — students, teachers, institute admins, super admins
- **Route guards** (`AuthGuard`, `CheckPermissionGuard`, `CheckClassroomsGuard`) protecting all routes
- **Admin impersonation** for support and debugging

### Classroom & Curriculum Management
- **Multi-step wizard** for creating classrooms with programme mapping, learning units, and resources
- **Programme Templates** — reusable curriculum blueprints with learning unit associations
- **Learning Units** — granular curriculum components with external resource management
- **Institution management** — CRUD for schools and educational partners

### Assignment & Quiz Engine
- **4 assignment types**: Upload, Quiz, Form, and Textblock
- **Full quiz player** supporting 5 question types: MCQ, Fill-in-the-Blanks, Text Response, Rich Blanks, Descriptive
- **Real-time timer**, offline prefetch via IndexedDB, and submission replay
- **Teacher review** interface with submission attempts table and replay functionality
- **Assignment reports** with analytics and download options

### Contest & Nomination System
- **Multi-stage contest workflows** with configurable execution stages
- **Nomination dashboard** — card view, list view, and tabular layouts
- **Contest leaderboards** and class/STEM-level analytics
- **Workflow template system** — reusable blueprints for contests and events

### Event Management
- **Event scheduling** with configurable workflow stages
- **Event dashboard** with metrics and status tracking
- **Workshop dialogs** for event session management

### Student & Teacher Information
- **Centralized profile repository** for students and teachers
- **Batch student credential creation** with PDF generation
- **Manage Students/Teachers** with institution-level mapping
- **STEM Club** student and teacher management

### Communication & Notifications
- **WhatsApp integration** (Freshchat API) — 15+ notification templates for approvals, submissions, registrations, nominations
- **Slack notifications** for audit logs, content management, and institution changes
- **Email notifications** via MailJet API
- **SMS OTP** via Exotel for authentication

### Certificate Generation
- **Template-based PDF certificates** with dynamic student name insertion
- **Bulk certificate generation** and raw PDF upload support
- **PDF editing** for student name customization

### IoT Kit Management
- **Kit CRUD operations** — add, edit, delete, and track kit devices
- **Remote device pairing** for STEM lab experiments
- **Inactive device management** and classroom-kit linking

### Outreach & Registration
- **QR code-based** teacher registration for community outreach programs
- **Self-registration** with admin approval workflow
- **Multi-step classroom registration** flow

### Reporting & Export
- **ApexCharts dashboards** for contest and assignment analytics
- **Excel export** (xlsx) and **CSV parsing** (PapaParse)
- **PDF report generation** with auto-tables
- **Visit tracking** for institution site visits

### Additional Features
- **Skeleton loaders** (ngx-skeleton-loader) for loading states
- **Stagger fade-in animations** and hover micro-interactions
- **WCAG accessibility** — ARIA labels and `prefers-reduced-motion` support
- **PWA** with service worker for offline capabilities
- **Multi-domain support** with domain-specific theming
- **Face blurring** tool for privacy in student-submitted images
- **Gamification module** for interactive learning activities

## Project Stats

| Metric | Value |
|--------|-------|
| Components & Services | 423+ |
| Feature Modules | 45+ |
| Core Firestore Services | 25+ |
| Deployment Environments | 4 (Production, Staging, Sandbox, Jigyaasa) |
| Lines of Code | 233,000+ |

## Getting Started

### Prerequisites

- **Node.js** >= 16.x
- **Angular CLI** 14.x (`npm install -g @angular/cli@14`)
- **Firebase CLI** (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/Santoshrk021/teacher_corner2.0.git
cd teacher_corner2.0

# Install dependencies
npm install --legacy-peer-deps
```

### Environment Setup

This project requires environment configuration files with API keys. These are excluded from the repository for security.

1. Copy the example template:
   ```bash
   cp src/environments/environment.example.ts src/environments/environment.dev.ts
   cp src/environments/environment.example.ts src/environments/environment.prod.ts
   cp src/environments/environment.example.ts src/environments/environment.jigyaasa.ts
   ```

2. Create `src/environments/environment.ts`:
   ```typescript
   import { environment as devEnvironment } from './environment.dev';
   export const environment = devEnvironment;
   environment.production = false;
   ```

3. Fill in the actual API keys in each environment file:
   - Firebase config (apiKey, authDomain, projectId, etc.)
   - WhatsApp / Freshchat token
   - Slack bearer tokens
   - Exotel SMS credentials
   - Google Maps API key
   - MailJet API credentials

### Development Server

```bash
npm start
# App runs at http://localhost:4200
```

### Production Build

```bash
ng build --configuration production --aot
```

### Deployment

```bash
# Staging
npm run deploy-staging

# Sandbox (Development)
npm run deploy-sandbox

# Jigyaasa variant
npm run deploy-jigyaasa

# All environments
npm run deploy-all
```

### Linting

```bash
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix lint errors
```

## Key Technical Highlights

- **Lazy-loaded modules** — all 45+ feature modules load on demand for fast initial load
- **Reactive data layer** — Firestore subscriptions via RxJS (`switchMap`, `combineLatest`, `forkJoin`) across 25+ services
- **Parallelized API calls** — `Promise.all()` batch-fetch pattern reducing LCP by ~82% in data-heavy views
- **Modular component architecture** — large templates decomposed into sub-components using `@Input()`/`@Output()` patterns
- **Offline-first quiz engine** — IndexedDB prefetch for quiz data with service worker caching
- **Multi-environment builds** — Angular file replacements for 4 deployment targets from a single codebase

## Author

**Santosh Kanta** — Frontend Developer
