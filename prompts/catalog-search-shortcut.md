# Fix: Ctrl+K / ⌘K doesn't focus the courses catalog search

## Goal
Pressing Ctrl+K (Windows/Linux) or ⌘K (Mac) on `/courses`, in both the All and Saved views, focuses the search field, as it does on the home page.

## Cause
- `components/course-catalog.tsx` renders `SearchInput`, which shows the "⌘ K" hint, but it has no `id` and no `SearchShortcut` listener.
- `components/search-shortcut.tsx` focuses an element by id on Ctrl/⌘+K. It is used only on the home page (`targetId="home-search"`).

## Decisions
- Give the catalog field `id="catalog-search"` and render `<SearchShortcut targetId="catalog-search" />` next to it.
- When the shortcut fires, also select the existing text, so typing replaces the query. This is a small change in `SearchShortcut`; home behavior stays the same apart from the selection.

## Files
- `components/course-catalog.tsx`
- `components/search-shortcut.tsx`

## Security
None.

## Acceptance
- On `/courses` and `/courses?view=saved`, Ctrl+K or ⌘K focuses the search field and selects its text.
- Home still works.

## Checks
- `npx tsc --noEmit`, `npm run lint`.

## Manual test
1. `npm run dev`, open `/courses?view=saved`, press Ctrl+K. The cursor should be in the search box.
2. Repeat on `/courses` and `/`.
