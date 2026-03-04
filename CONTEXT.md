# AppDoc — Application Context

## What It Is

AppDoc is a standalone web app that auto-generates markdown documentation for any software application. It takes structured feature data (Jira epics/stories), optional design documents, and UI context (screenshots or a crawled website) as inputs, lets the user define one or more target audiences, and streams AI-generated markdown docs in real time.

No login required. Jira credentials are persisted in the browser's localStorage.

## Who Uses It

Product managers, developers, and technical writers who need to produce documentation quickly from existing Jira project data, design specs, and application UI — without writing it from scratch.

## The Wizard Flow

AppDoc is a 6-step wizard:

| Step | Name | What happens |
|---|---|---|
| 1 | **Sources** | Enter Jira credentials + test connection; optionally upload design documents (PDF, DOCX, MD, TXT); choose upload screenshots or crawl a URL for UI context |
| 2 | **App Info** | Enter the application name and a short description |
| 3 | **Audiences** | Define one or more target audiences (name + description); optionally customize the generation prompt per audience (with revert-to-default); choose per-audience or combined generation |
| 4 | **Output Format** | Choose export formats (Markdown, HTML, PDF); optionally embed uploaded screenshots in HTML/PDF output |
| 5 | **Generate** | Fetch Jira data, run crawl (if applicable), then stream documentation from the AI model |
| 6 | **Output** | Preview rendered markdown; copy to clipboard or download in any selected format (.md, .html, .pdf) |

## Inputs

### Jira
- Connects to any Jira Cloud instance via the REST API (Basic auth — email + API token)
- Fetches all epics and stories for a given project key
- Parses Atlassian Document Format (ADF) description fields into plain text
- Paginates automatically for projects with >100 issues

### Design Documents (optional)
- Upload PDF, DOCX, MD, or TXT files (specs, PRDs, design docs) as supplemental input
- TXT and MD files are read as text client-side
- PDF and DOCX files are parsed server-side via `/api/parse-doc` (using `mammoth` for DOCX, `pdf-parse` for PDF)
- Document text is injected into the generation prompt alongside Jira data

### UI Context (choose one)
- **Upload screenshots** — drag-and-drop PNG/JPEG/GIF/WEBP files; passed to the AI model as base64 image blocks
- **Crawl a URL** — BFS crawl of a live website using Cheerio (same-origin, max 30 pages, depth 1–4); extracts page title and main body text

## Generation Modes

| Mode | Description |
|---|---|
| **Per-audience** | One AI call per audience, run in parallel (staggered 300ms to avoid RPM limits) — produces a separate markdown document for each audience |
| **Combined** | Single AI call with all audiences merged — produces one document addressing all audiences |

## Per-Audience Prompts

Each audience can have a custom generation prompt. A `DEFAULT_PROMPT_TEMPLATE` (exported from `src/lib/claude.ts`) is used when no override is set. The template uses `{audience}` as a placeholder for the audience name. Users can edit the prompt directly in Step 3 and revert to the default at any time. A live preview shows the prompt with the audience name substituted.

## Output

- Rendered markdown preview (react-markdown + remark-gfm + Tailwind typography)
- Tab bar when multiple audience docs are generated
- Copy to clipboard
- **Download as `.md`** — plain markdown file
- **Download as `.html`** — self-contained HTML file with embedded CSS; optionally includes an appendix of uploaded screenshots as base64 `<img>` tags
- **Download as `.pdf`** — generated client-side from the rendered HTML using `html2pdf.js`; optionally appends screenshots

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **AI:** `@google/generative-ai` with streaming (`gemini-2.0-flash`)
- **Document parsing:** `mammoth` (DOCX), `pdf-parse` (PDF) — server-side only
- **PDF export:** `html2pdf.js` — client-side, browser only
- **Web crawling:** `cheerio` (HTML parsing, no headless browser)
- **Markdown rendering:** `react-markdown` + `remark-gfm` + `@tailwindcss/typography`
- **State:** React `useState` + `useLocalStorage` hook (SSR-safe two-phase hydration)
- **No database** — fully stateless; credentials live in localStorage only

## Key Technical Notes

- The `/api/generate` route uses `new Response(readable, ...)` (not `NextResponse`) to enable true streaming
- Parallel streams are staggered by `idx * 300ms` to stay within API RPM limits
- Base64 image prefixes (`data:[mime];base64,`) are stripped before sending to the AI API
- The Cheerio crawler warns in the UI if pages return very little text (likely a SPA)
- `maxDuration = 60` on `/api/crawl`, `maxDuration = 120` on `/api/generate`, `maxDuration = 30` on `/api/parse-doc` for Vercel compatibility
- `pdf-parse` must be loaded via `require()` in the API route (ESM interop issue with dynamic `import()`)
- `html2pdf.js` is loaded via dynamic `import()` at download time (browser-only)
- Old persisted `WizardState` in localStorage is forward-migrated with `?? defaultValue` in WizardShell for new fields (`designDocs`, `outputFormats`, `embedScreenshots`)

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini AI API access |

Jira credentials are supplied by the user at runtime and never stored server-side.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx / page.tsx
│   └── api/
│       ├── jira/route.ts       — fetch epics + stories
│       ├── crawl/route.ts      — Cheerio BFS crawl
│       ├── generate/route.ts   — streaming AI generation
│       └── parse-doc/route.ts  — server-side PDF/DOCX text extraction
├── components/
│   ├── wizard/                 — WizardShell + Step1–6
│   │   ├── Step1Sources.tsx    — Jira + design doc upload + UI context
│   │   ├── Step2AppInfo.tsx    — app name + description
│   │   ├── Step3Audiences.tsx  — audiences + per-audience prompt editing
│   │   ├── Step4OutputFormat.tsx — export format + screenshot embedding
│   │   ├── Step4Generate.tsx   — data fetch + streaming generation (step 5)
│   │   ├── Step6Output.tsx     — preview + multi-format download
│   │   └── WizardShell.tsx     — step routing + shared state
│   ├── ui/                     — Button, Input, Textarea, Label, Card, Spinner, DropZone
│   └── MarkdownPreview.tsx
├── hooks/
│   ├── useLocalStorage.ts      — SSR-safe localStorage
│   └── useStreamingGenerate.ts — parallel stream orchestration
├── lib/
│   ├── jira.ts                 — Jira API + ADF parser
│   ├── crawl.ts                — Cheerio crawler
│   ├── claude.ts               — Gemini client + DEFAULT_PROMPT_TEMPLATE + prompt builder
│   └── utils.ts                — cn(), randomUUID(), downloadMarkdown(), downloadHtml()
└── types/index.ts              — all shared TypeScript types
```
