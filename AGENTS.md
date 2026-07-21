# ai-opportunity-snapshot - Agent Config

Public web app: a local service business enters name + URL; GPT-5.6 researches it and returns a
shareable AI Opportunity Snapshot (readiness score, ROI estimate range, top automations, AI
visibility check).

## Stack

Astro 6 SSR + @astrojs/cloudflare on Cloudflare Workers. Pipeline code is framework-agnostic in
`src/lib/`, callable from API routes and the CLI (`src/cli/snapshot.ts`). OpenAI GPT-5.6 uses the
Responses API with web search and strict JSON-schema structured outputs. Cloudflare KV provides
persistence.

## Commands

- `npm run dev` / `npm run build` / `npm run deploy`
- `npm test` - unit tests (run after touching ROI, bands, copy, schemas, or rendering)
- `npm run snapshot -- --name "..." --url https://...` - real end-to-end run from the CLI
- `npm run snapshot:test` - fixture render, zero API calls

## Hard rules

- No em dashes anywhere. Use " - ". The words "audit" and "Clarity Call" never appear in
  user-facing copy. Tests enforce this.
- All dollar figures are estimates computed in `src/lib/roi.ts` from the printed assumptions table.
  The LLM never produces dollar amounts.
- Secrets are injected from a local secret manager during development or stored as Worker secrets
  in production. Never commit keys.
- The model ID comes from `OPENAI_MODEL` and defaults to `gpt-5.6`.
