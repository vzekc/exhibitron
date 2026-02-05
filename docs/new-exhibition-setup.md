# Creating a New Exhibition

This document describes the steps required to create a new exhibition in Exhibitron, based on the CC 2025 → CC 2026 transition (commit 7b0c2bc).

## Overview

When transitioning to a new exhibition year, the following steps are required:

1. **Database Schema Changes** (one-time, already done)
   - Add `frozen` field to Exhibition entity
   - Add `location` field to Exhibition entity

2. **Create New Exhibition Record**
3. **Freeze Previous Exhibition**
4. **Copy Pages from Previous Exhibition**
5. **Update Frontend Assets**

## Detailed Steps

### 1. Create Migration for New Exhibition

Create a migration file in `backend/src/migrations/` with the following operations:

```typescript
// Example: Migration20260204000000_cc2026_exhibition.ts

// 1. Update previous exhibition
this.addSql(`
  UPDATE "exhibition"
  SET location = '<location phrase in German dative case>',
      frozen = true,
      host_match = '<year>\\.classic-computing\\.de|.*<year>.*'
  WHERE key = 'cc<previous_year>';
`)

// 2. Create new exhibition
this.addSql(`
  INSERT INTO "exhibition" (
    key, title, host_match, start_date, end_date,
    dns_zone, location, frozen, created_at, updated_at
  ) VALUES (
    'cc<year>',
    'Classic Computing <year>',
    '<year>\\.classic-computing\\.de|localhost|127\\.0\\.0\\.1|\\[::1\\]',
    '<start_date>',
    '<end_date>',
    '<year>.classic-computing.de',
    '<location phrase>',
    false,
    now(),
    now()
  );
`)
```

#### Host Match Patterns

- **Previous exhibition**: `<year>\.classic-computing\.de|.*<year>.*`
  - Matches production domain AND any hostname containing the year (for local testing)
- **New exhibition**: `<year>\.classic-computing\.de|localhost|127\.0\.0\.1|\[::1\]`
  - Matches production domain AND localhost variants (default for development)

#### Location Field

The `location` field stores a grammatically correct German phrase in dative case:
- "in der Freiheitshalle in Hof"
- "in der CD Kaserne in Celle"

This is used in sentences like "die vom 9. bis 11. Oktober **in der CD Kaserne in Celle** stattfindet".

### 2. Create Migration to Copy Pages

Create a second migration to copy pages from the previous exhibition:

```typescript
// Example: Migration20260204200000_copy_pages_to_cc2026.ts

// For each page in previous exhibition:
// 1. Copy the Document (html content)
// 2. Copy any DocumentImages and their ImageStorage/ImageVariants
// 3. Create new Page with copied content

// Special handling:
// - Update home page title to reflect new year/location
```

### 3. Update Frontend Assets

#### Seatplan SVG

The seatplan is exhibition-specific. Create a new file:
- Rename: `frontend/public/seatplan.svg` → `frontend/public/seatplan-cc<previous_year>.svg`
- Create: `frontend/public/seatplan-cc<new_year>.svg` with new venue layout

The `SeatingPlan.tsx` component dynamically loads `/seatplan-${exhibitionKey}.svg`.

### 4. Run Migrations

```bash
cd backend
npm run migration:up
```

## What Gets Frozen

When an exhibition is frozen (`frozen = true`), the following mutations are blocked:

| Module | Blocked Mutations |
|--------|-------------------|
| Exhibit | createExhibit, updateExhibit, deleteExhibit |
| Exhibitor | updateExhibitor |
| Page | createPage, updatePage, deletePage |
| Table | claimTable, releaseTable, assignTable |
| Registration | register |
| ConferenceSession | create/update/delete |

**Not blocked:**
- Contact forms (sendVisitorEmail) - allows visitors to contact exhibitors
- Read operations - all data remains viewable

## ExhibitionContext

The frontend uses `ExhibitionContext` to provide exhibition data globally:

```typescript
// Available via useExhibition() hook:
{
  exhibition: {
    id: number
    key: string      // e.g., "cc2026"
    title: string    // e.g., "Classic Computing 2026"
    frozen: boolean
    location: string // e.g., "in der CD Kaserne in Celle"
    startDate: string
    endDate: string
  }
}
```

Components use this instead of making individual GraphQL queries for basic exhibition info.

## Bulk Exhibit Import

Returning exhibitors can import their exhibits from previous exhibitions:

1. Navigate to `/user/import-exhibits`
2. See list of their exhibits from other exhibitions
3. Select exhibits to copy
4. Exhibits are copied with:
   - ✅ Title, touchMe flag, attributes
   - ✅ Description (new Document with copied HTML)
   - ✅ Main image (new ImageStorage with copied data)
   - ❌ Table assignment (must claim new table)
   - ❌ Host assignment

## Future Automation

To fully automate new exhibition creation, consider:

1. **Admin UI**: Add exhibition management page to create/configure exhibitions
2. **CLI Command**: `npm run create-exhibition -- --year=2027 --location="..." --start=2027-10-08 --end=2027-10-10`
3. **Template System**: Store page templates that get copied to each new exhibition

### Suggested CLI Implementation

```typescript
// backend/src/scripts/create-exhibition.ts
interface ExhibitionConfig {
  year: number
  previousYear: number
  title: string
  location: string
  startDate: string
  endDate: string
  dnsZone: string
}

async function createExhibition(config: ExhibitionConfig) {
  // 1. Freeze previous exhibition
  // 2. Create new exhibition record
  // 3. Copy pages with documents
  // 4. Log instructions for seatplan SVG
}
```

## Checklist for New Exhibition

- [ ] Create migration for new exhibition record
- [ ] Set location phrase (German dative case)
- [ ] Set correct dates (Friday-Sunday)
- [ ] Create migration to copy pages
- [ ] Update home page title in migration
- [ ] Create seatplan SVG for new venue
- [ ] Run migrations
- [ ] Verify previous exhibition is frozen
- [ ] Verify new exhibition is accessible on localhost
- [ ] Test registration form shows new dates/location
- [ ] Test exhibit import from previous year
