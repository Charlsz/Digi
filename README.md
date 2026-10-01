# Digi

A private drawing desk for sketch, manga, tone, sumi, pencil, and marker.

Drawings are saved in Supabase (project `digi`). Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.

```bash
npm run dev
```

Open `/` to draw and `/archive` to see saved sheets.

## Desk

- Brushes: Sketch, Manga, Tone, Sumi, Pencil, Marker, plus Eraser
- Ink: Sumi, Charcoal, Stone, Ash
- Shortcuts: `Ctrl+Z` undo, `[` / `]` width, `1`–`6` brushes, `E` eraser
- Save keeps strokes in Supabase; Download exports a PNG of the current sheet
