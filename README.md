# PONGS Quote Maker

A production-grade quotation terminal for PONGS stretch-ceiling projects — quote builder,
pure calculation engine, and a 4-page client PDF. Built with Next.js (App Router) + TypeScript +
Tailwind, with Turso/libSQL persistence.

## Features

- **Fast quote builder** — collapsible item cards, progressive lighting configuration, live cost
  sidebar (sticky on desktop, bottom bar on mobile), and autosave.
- **Pure calculation engine** (`src/lib/calculations.ts`) — framework-free and deterministic:
  `Quote → calculateQuote(Quote) → QuoteBreakdown`. Runs identically in the browser preview and on
  the server.
  - Fabric roll selection & wastage on 2/3/4/5 m rolls, min-wastage orientation, center/off-center
    joints, smart margin, circle billing on 1–5 m rolls.
  - LED strip count `ceil(short/spacing)+1` (circle ×0.8), running metres, wattage (12.5/15/13 W/m).
  - Driver packing at 85 % load (prefers 200 W, avoids 600 W), full per-light-type driver/control
    rules, quantity looping and cross-item loop groups.
  - Markup on materials only, installation, transport, 18 % GST, per-sqft mode.
  - `manual` tier (direct fabric/LED/gripper rates) and `manual_custom` (free-form rows that
    bypass the engine).
- **Transparency** — per-item breakdown, team view, and an internal cost/margin view.
- **Client PDF** — 4-page A4 document; export via the print dialog or html2canvas + jsPDF
  (Web-Share on mobile, download otherwise).
- **Validation** — Zod schemas + field-level checks; invalid geometry surfaces an explicit
  "joint required" instead of a confusing result.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your Turso credentials (optional)
npm run dev
```

Without Turso credentials the app runs against an in-memory store (data is not persisted across
restarts). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to persist.

## Tests

```bash
npm test        # runs the calculation-engine test suite (Vitest)
```

## Architecture

```
src/lib/types.ts          all quote types
src/lib/pricing.ts        three-tier price tables + p() tier selector
src/lib/calculations.ts   the engine (pure; imports only pricing + types)
src/lib/validation.ts     Zod schemas + UI validation
src/lib/companies.ts      company/branding registry for the PDF
src/lib/db.ts             Turso/libSQL persistence (in-memory fallback)
src/components/           builder, item form, summary, breakdown, PDF, export
src/app/                  pages + API routes
```

Business logic is the source of truth and is covered by tests; see `src/lib/calculations.test.ts`.
