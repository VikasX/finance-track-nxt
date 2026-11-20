## Project continuity

- At the start of a new session in this repository, read [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) for the current project state, flow maps, decisions, limitations, and verification history.
- Use [docs/READING_CODE.md](docs/READING_CODE.md) for the beginner walkthrough. Keep what/why comments accurate when changing code; explain unfamiliar concepts plainly.
- Inspect Git status and current files before acting. Historical passing checks in the handoff are not evidence of a fresh run or a currently running service.
- After meaningful completed work, update the handoff with the actual outcome, remaining work, and checks performed. Keep credentials out of documentation.
- Continue from the user's current request; do not restart completed setup or invent a next implementation phase from historical plans.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
