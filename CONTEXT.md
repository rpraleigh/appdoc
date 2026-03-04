# AppDoc — Application Context

## What It Is

AppDoc is a standalone web app that auto-generates markdown documentation for any software application. It takes structured feature data (Jira epics/stories) and UI context (screenshots or a crawled website) as inputs, lets the user define one or more target audiences, and streams Claude-generated markdown docs in real time.

No login required. Jira credentials are persisted in the browser's localStorage.

## Who Uses It

Product managers, developers, and technical writers who need to produce documentation quickly from existing Jira project data and application UI — without writing it from scratch.

## The Wizard Flow

AppDoc is a 5-step wizard:

| Step | Name | What happens |
|---|---|---|
| 1 | **Sources** | Enter Jira credentials + test connection; choose upload screenshots or crawl a URL |
| 2 | **App Info** | Enter the application name and a short description |
| 3 | **Audiences** | Define one or more target audiences (name + description); choose per-audience or combined generation |
| 4 | **Generate** | Fetch Jira data, run crawl (if applicable), then stream documentation from Claude |
| 5 | **Output** | Preview rendered markdown; copy to clipboard or download as `.md` |

## Inputs

### Jira
- Connects to any Jira Cloud instance via the REST API (Basic auth — email + API token)
- Fetches all epics and stories for a given project key
- Parses Atlassian Document Format (ADF) description fields into plain text
- Paginates automatically for projects with >100 issues

### UI Context (choose one)
- **Upload screenshots** — drag-and-drop PNG/JPEG/GIF/WEBP files; passed to Claude as base64 image blocks
- **Crawl a URL** — BFS crawl of a live website using Cheerio (same-origin, max 30 pages, depth 1–4); extracts page title and main body text

## Generation Modes

| Mode | Description |
|---|---|
| **Per-audience** | One Claude call per audience, run in parallel (staggered 300ms to avoid RPM limits) — produces a separate markdown document for each audience |
| **Combined** | Single Claude call with all audiences merged — produces one document addressing all audiences |

## Output

- Rendered markdown preview (react-markdown + remark-gfm + Tailwind typography)
- Tab bar when multiple audience docs are generated
- Copy to clipboard and download as `.md`

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **AI:** `@anthropic-ai/sdk` with streaming (`claude-opus-4-6`, 4096 max tokens)
- **Web crawling:** `cheerio` (HTML parsing, no headless browser)
- **Markdown rendering:** `react-markdown` + `remark-gfm` + `@tailwindcss/typography`
- **State:** React `useState` + `useLocalStorage` hook (SSR-safe two-phase hydration)
- **No database** — fully stateless; credentials live in localStorage only

## Key Technical Notes

- The `/api/generate` route uses `new Response(readable, ...)` (not `NextResponse`) to enable true streaming
- Parallel streams are staggered by `idx * 300ms` to stay within Anthropic RPM limits
- Base64 image prefixes (`data:[mime];base64,`) are stripped before sending to the Anthropic API
- The Cheerio crawler warns in the UI if pages return very little text (likely a SPA)
- `maxDuration = 60` on `/api/crawl`, `maxDuration = 120` on `/api/generate` for Vercel compatibility

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API access |

Jira credentials are supplied by the user at runtime and never stored server-side.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx / page.tsx
│   └── api/
│       ├── jira/route.ts       — fetch epics + stories
│       ├── crawl/route.ts      — Cheerio BFS crawl
│       └── generate/route.ts   — streaming Claude generation
├── components/
│   ├── wizard/                 — WizardShell + Step1–5
│   ├── ui/                     — Button, Input, Textarea, Label, Card, Spinner, DropZone
│   └── MarkdownPreview.tsx
├── hooks/
│   ├── useLocalStorage.ts      — SSR-safe localStorage
│   └── useStreamingGenerate.ts — parallel stream orchestration
├── lib/
│   ├── jira.ts                 — Jira API + ADF parser
│   ├── crawl.ts                — Cheerio crawler
│   ├── claude.ts               — Anthropic client + prompt builder
│   └── utils.ts                — cn(), randomUUID(), downloadMarkdown()
└── types/index.ts              — all shared TypeScript types
```
