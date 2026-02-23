# Teacher Corner 2.0 - Agent Guide

## Commands
- **Start dev**: `npm start` (ng serve)
- **Build**: `npm run build` (production), `ng build --configuration development` (dev)
- **Test**: `npm test` (Karma + Jasmine), single test: `ng test --include="**/*.spec.ts"`
- **Lint**: `npm run lint` or `npm run lint:fix`
- **Format**: `npm run prettify` (Prettier)

## Architecture
- **Framework**: Angular 14 + Angular Material + Fuse Admin Template
- **Database**: Firebase Firestore + Apollo GraphQL
- **Multi-tenant**: 4 environments (sandbox, staging, jigyaasa)
- **Key modules**: quiz, assignments, classroom, dashboard, tactivity, contests
- **Core services**: Located in `src/app/core/dbOperations/`
- **UI framework**: Fuse (@fuse/) for layouts/components, Tailwind CSS

## Code Style
- **Files**: kebab-case naming, co-located `.spec.ts` tests
- **Imports**: Absolute paths from `src/`, use `@fuse/` and `app/` prefixes
- **Components**: `app-` prefix, TypeScript strict mode, explicit return types required
- **Quotes**: Single quotes, max line length 180 chars
- **Style**: SCSS with Tailwind, no underscore-dangle, camelCase for properties
