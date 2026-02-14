# Beads Web

## Documentation Rule

**MANDATORY:** Whenever you change features, APIs, data flows, file structure, or components in this project, you MUST update `ARCHITECTURE.md` in the same commit. The factory agent depends on this file to understand the system.
- Add a new page, API route, hook, component, or lib module -> update the relevant section
- Change how data flows or add a new pattern -> update Data Flow and Important Patterns
- Add, remove, or change a user-facing feature -> update the **Features** section
- Change the file structure -> update the File Structure tree

## Architecture

See `ARCHITECTURE.md` for full system documentation: pages, API routes, data flow, components, hooks, lib modules, design system, and file structure.

## Quick Reference

- **Stack:** Next.js 14, React 18, TanStack Query 5, ReactFlow 11, better-sqlite3, Tailwind CSS 3
- **Data:** `.beads/beads.db` (SQLite, source of truth) -> bv-client.ts -> API routes -> React hooks -> UI
- **Multi-repo:** `~/.beads-web.json` config, `__all__` sentinel for aggregation mode
- **Fallback chain:** bv CLI -> SQLite -> JSONL -> empty response
- **Schema tolerance:** sqlite-reader.ts uses `PRAGMA table_info` to handle different beads DB versions
