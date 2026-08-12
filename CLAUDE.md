# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

Exhibitron is a dynamic catalog application for the CC conference (Vintage Computer Festival). It's
a full-stack TypeScript monorepo using pnpm workspaces with `frontend/` and `backend/` packages.

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

The system supports multiple exhibitions matched by hostname using regex patterns. Each exhibition
has its own exhibitors, exhibits, tables, and registrations.

### GraphQL Code Generation

Both backend and frontend use gql.tada for type-safe GraphQL. After changing `.graphql` schema
files, run `npm run generate` in the respective package.

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

## Error handling — never swallow errors silently

This is a hard rule. A failed mutation that the user can't see is worse than a thrown exception.

**Frontend Apollo mutations.** The Apollo client is configured with `errorPolicy: 'all'` and a
`fetch` override that downgrades non-2xx responses to 200, so GraphQL errors land in `result.errors`
instead of throwing. `await someMutation(...)` without inspecting the result silently eats every
server-side error. Always do one of:

- `const result = await mutation(...); if (result.errors?.length) { await showMessage('Fehler', result.errors[0]?.message || '<German fallback>', 'OK'); return }`
  — then bail out before any side effects (navigation, success modals, state changes that imply
  success).
- `useMutation(QUERY, { onError: (error) => ... })` for fire-and-forget call sites.

Never do `try { await mutation(...) } catch (e) { console.error(e) }` — Apollo doesn't throw with
this config, so the catch never fires _and_ the error is hidden. Reference patterns:
`frontend/src/pages/user/Profile.tsx`, `frontend/src/pages/user/ExhibitEditor.tsx`,
`frontend/src/components/seatingPlan/TableInfo.tsx`.

**Backend resolvers.** Don't let raw `UniqueConstraintViolationException` (or other MikroORM errors)
bubble up as `INTERNAL_SERVER_ERROR` — the user sees nothing useful and the SQL leaks into logs.
Catch known constraint failures and rethrow as `UniqueConstraintError` / `BadRequestError` / etc.
from `modules/common/errors.ts` with a German user-facing message. To catch flush-time errors inside
the resolver, call `await db.em.flush()` explicitly. Reference pattern:
`backend/src/modules/host/resolvers.ts` (`addHost`).

**The "No try/catch unless unavoidable" rule above is not a license to silently drop errors** — it
means prefer letting errors propagate to a place that handles them, not "ignore them."

## The camera page is a preview of the booth, not a web version of it

`/foto/kamera` shows the Fotoautomat that stands in the entrance hall, so that exhibitors can see
what it does to a photo without queueing at it. It is a preview of that machine and must look as
close to the Indy's own screens as possible.

**The screens get no web-specific text.** They are copied verbatim from the fotofix repository
(`camera/assets/screens/`) into `backend/assets/booth/` by `sync-booth-screens.mjs` there, and its
`--check` fails the build when the two have drifted. A line that reads oddly in a browser — the
printer, the Ausstellungsnetz, "Freigabe über die Steuerung" for a control port a browser does not
have — stays as the booth says it. Change it in fotofix, for both, or leave it; do not write a
second wording for the web.

The layout, the type and the colours come from `booth.css`, and the coordinates of the picture, the
countdown and the photo ID from `screen.manifest` — the same two files the Indy reads. Nothing on
this side decides where anything goes.

Only what a browser makes impossible may differ, and only as mechanism, never as appearance:

- the camera has to be asked for, which happens on the first press rather than at the invitation;
- the Laufzettel is fetched as a PDF, because there is no printer;
- the fault screen is released by the red button, because there is no control port to send `CLEAR`
  over.

## Environment Variables (backend/.env)

Required:

- `SESSION_SECRET` - Session encryption key
- `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` - WoltLab forum OAuth
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD` - Email config
