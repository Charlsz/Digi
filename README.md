# Digi

A private drawing desk for sketch, manga, tone, sumi, pencil, and marker.

Drawings are saved through Digi's API into Supabase (project `digi`). The browser never talks to Supabase directly.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `SUPABASE_URL` and prefer `SUPABASE_SERVICE_ROLE_KEY` so the drawings table can stay closed to anonymous clients.
3. Apply migrations in `supabase/migrations/` (or restore the Digi project and run them there).
4. Start the desk:

```bash
npm run dev
```

Open `/` to draw and `/archive` to browse saved sheets.

## Desk

- Brushes: Sketch, Manga, Tone, Sumi, Pencil, Marker, plus Eraser
- Ink: Sumi, Charcoal, Stone, Ash
- Shortcuts: `Ctrl+Z` undo, `Ctrl+Y` / `Ctrl+Shift+Z` redo, `[` / `]` width, `1`–`6` brushes, `E` eraser
- Save keeps strokes in Supabase; Download exports a PNG of the current sheet
- Unsaved work is kept as a local draft and warned about before leaving the page

## Architecture

| Layer | Role |
| --- | --- |
| `components/studio*.tsx` | Desk UI: brushes, sheet, save bar |
| `hooks/use-sheet-canvas.ts` | Pointer capture, stroke capture, canvas commit |
| `lib/render.ts` | Brush rendering |
| `lib/drawing-input.ts` | Server-side validation for save payloads |
| `app/api/drawings/*` | CRUD API used by the desk and archive |
| `lib/drawings.ts` + `lib/supabase.ts` | Supabase access (service role preferred) |
| `supabase/migrations/` | Schema, RLS lockdown, `updated_at` trigger |

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```
