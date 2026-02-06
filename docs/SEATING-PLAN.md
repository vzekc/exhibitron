# Seating Plan System

The seating plan is a **convention-over-configuration** system with three parts: a background image, an SVG overlay with clickable table elements, and database records. No code changes are needed to add a seating plan for a new exhibition.

## How It Works

### 1. Background Image

A PNG of the physical venue floor plan, stored as:

```
frontend/public/{key}-tischplan.png
```

For example, `cc2025-tischplan.png`. This is referenced from inside the SVG.

### 2. SVG File (the interactive floor plan)

Stored as `frontend/public/seatplan-{key}.svg` where `{key}` is the exhibition's `key` field in the database (e.g., `cc2025`).

The SVG contains:

- A `<image href="{key}-tischplan.png">` element embedding the background
- Clickable table overlays, each a `<g>` group with ID `table_N`:

```xml
<g id="table_28">
  <rect class="table" x="190" y="396" width="31" height="14" />
  <text class="table-text" x="206" y="404">28</text>
</g>
```

- Embedded CSS styling tables (white default, blue on hover, green when occupied)
- Optional area labels as static `<text>` elements (e.g., "Apple", "Commodore")

**Key convention:** The `N` in `table_N` maps directly to the `number` field of the `Table` entity in the database. No configuration file is needed -- the frontend discovers tables by querying the SVG DOM for elements matching `[id^="table_"]`.

Table numbers don't need to be sequential. The cc2025 SVG uses non-contiguous numbering (1-4, 8-17, 20-75, 79-107).

### 3. Database Records

Each table is a row in the `table` entity with:

- `number` -- matches the SVG `table_N` ID
- `exhibition` -- which exhibition this table belongs to
- `exhibitor` -- who claimed/was assigned this table (nullable)

### How the Frontend Connects Everything

`SeatingPlan.tsx` does the following:

1. Reads `exhibition.key` from context
2. Loads `/seatplan-${exhibitionKey}.svg` via the `ReactSVG` component
3. Fetches all tables and their occupancy via the `GetTables` GraphQL query
4. After SVG loads, runs `applyTableStyling()` which finds all `[id^="table_"]` elements, looks up occupancy, adds the `.occupied` CSS class to claimed tables, and adds tooltips
5. On click, extracts the table number from the element ID and shows a `TableInfoPanel`

## Creating a Seating Plan for a New Exhibition

### Step 1: Create the background image

Get or create a PNG of the venue floor plan:

```
frontend/public/{key}-tischplan.png
```

### Step 2: Create the SVG in Inkscape

Create `frontend/public/seatplan-{key}.svg`:

1. Set the canvas to match the background image dimensions
2. Add the background: `<image href="{key}-tischplan.png" width="..." height="..." />`
3. Copy the embedded `<style>` block from an existing SVG (the `.table`, `.table-text`, `.occupied` CSS rules)
4. For each physical table, create a group:
   - Set the group ID to `table_N` (where N is the table number)
   - Add a `<rect class="table">` positioned over the table location
   - Add a `<text class="table-text">` centered on the rect showing the number
   - For rotated tables (e.g., along a wall), use `transform="rotate(90)"`
5. Add area labels as static `<text>` elements if desired

### Step 3: Create database table records

Write a migration that inserts `Table` rows for the new exhibition:

```sql
INSERT INTO "table" (exhibition_id, number, created_at, updated_at)
SELECT e.id, generate_series(1, 50), now(), now()
FROM exhibition e WHERE e.key = '{key}';
```

For non-contiguous numbering, use a `VALUES` list instead of `generate_series`.

### Step 4: Done

No code changes are needed. The `SeatingPlan.tsx` component automatically:

- Constructs the SVG path from `exhibition.key`
- Discovers tables by scanning for `[id^="table_"]` elements
- Matches them to database records by number

If the SVG doesn't exist yet, the component shows a "Failed to load seating plan" message with a retry button, so you can set up the database first and add the SVG later.

## Embedded CSS Reference

The SVG must include these CSS rules (copy from an existing seating plan SVG):

| Class | Purpose |
|-------|---------|
| `.table` | Base rect style: white fill, pointer cursor |
| `.table:hover` | Hover: blue (`#5bc0de`) |
| `.table.occupied` | Occupied: green (`#5cb85c`) |
| `.table.occupied:hover` | Occupied hover: darker green (`#449d44`) |
| `.table-text` | Text: bold, 11px, centered, non-interactive |

## Checklist

| Step | What | Where |
|------|------|-------|
| 1 | Floor plan background image | `frontend/public/{key}-tischplan.png` |
| 2 | SVG with table overlays using `id="table_N"` | `frontend/public/seatplan-{key}.svg` |
| 3 | Table records in database matching the SVG numbers | Database migration |

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/components/SeatingPlan.tsx` | Main seating plan component |
| `frontend/src/components/seatingPlan/TableInfo.tsx` | Table info panel on click |
| `frontend/src/components/ReactSVG.tsx` | SVG loader |
| `frontend/src/components/SeatingPlan.css` | Additional CSS |
| `backend/src/modules/table/entity.ts` | Table entity (number, exhibition, exhibitor) |
| `backend/src/modules/table/schema.graphql` | GraphQL schema for table queries/mutations |
| `backend/src/modules/table/repository.ts` | Table claim/release logic |
