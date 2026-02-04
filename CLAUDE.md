# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Exhibitron is a dynamic catalog application for the CC conference (Vintage Computer Festival). It's a full-stack TypeScript monorepo using pnpm workspaces with `frontend/` and `backend/` packages.

## Commands

### Root-level (from project root)
```bash
pnpm dev          # Run backend, frontend dev server, and schema watcher in parallel
pnpm build        # Generate schemas → build frontend → build backend
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm prettier -c  # Check formatting
```

### Backend (from backend/)
```bash
npm run start:watch         # Dev server with hot reload
npm run test                # Run Vitest tests
npm run test:debug          # Run tests with DEBUG log level
npm run migration:up        # Run pending database migrations
npm run make-demo-db        # Fresh database with demo data
npm run generate            # GraphQL codegen + gql.tada
```

### Frontend (from frontend/)
```bash
npm run dev        # Vite dev server (port 5173, proxies to backend on 3001)
npm run build      # Generate types → TypeScript check → Vite build
npm run generate   # gql.tada code generation
```

## Architecture

### Backend
- **Fastify** server with **Apollo GraphQL** and REST endpoints
- **MikroORM** with PostgreSQL (citext extension for case-insensitive emails)
- **Transaction-per-request**: Every GraphQL request wrapped in a database transaction
- **OAuth2/OIDC** authentication via WoltLab forum + local password fallback
- **Pino** structured logging

**Module structure** (each in `backend/src/modules/`):
- `entity.ts` - MikroORM entity with decorators
- `resolvers.ts` - GraphQL Query/Mutation/Type resolvers
- `repository.ts` - Custom repository with business logic
- `schema.graphql` - Module's GraphQL schema
- `routes.ts` - REST API routes (optional)
- `test.ts` - Vitest tests

Key modules: user, exhibit, exhibitor, exhibition, registration, page, table, room, session, image

### Frontend
- **React 19** with **React Router v7**
- **Apollo Client** for GraphQL
- **Tailwind CSS** + **Pico CSS** for styling
- **Quill** rich text editor
- **gql.tada** for type-safe GraphQL queries

Path aliases: `@*` → `./src/*`, `@shared/*` → `../shared/src/*`

### Multi-Exhibition Support
The system supports multiple exhibitions matched by hostname using regex patterns. Each exhibition has its own exhibitors, exhibits, tables, and registrations.

### GraphQL Code Generation
Both backend and frontend use gql.tada for type-safe GraphQL. After changing `.graphql` schema files, run `npm run generate` in the respective package.

## Database

PostgreSQL with MikroORM. Default: `postgresql://postgres@localhost/exhibitron`

```bash
# Run migrations
cd backend && npm run migration:up

# Create fresh demo database
cd backend && npm run make-demo-db
```

## Testing

Vitest with 60s timeout. Tests create isolated test databases per suite.

```bash
# Run all tests
pnpm test

# Run single test file
cd backend && npx vitest run src/modules/user/test.ts
```

## Code Style

- Prettier: single quotes, no semicolons, 100 char width, trailing commas (ES5)
- No try/catch unless unavoidable
- Pre-commit hooks run: prettier check, lint, tests

## Environment Variables (backend/.env)

Required:
- `SESSION_SECRET` - Session encryption key
- `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` - WoltLab forum OAuth
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` - Email config
