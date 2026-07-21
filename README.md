# AI Opportunity Snapshot

Enter a local service business and GPT-5.6 researches it live, then returns a shareable report with an AI readiness score, an estimated revenue-left-on-the-table range, five automation opportunities, and a check of whether AI assistants recommend the business today.

**Live demo:** [opportunity-snapshot.airevenuestack-jason.workers.dev](https://opportunity-snapshot.airevenuestack-jason.workers.dev)

**Sample report:** [Fixture Sample Co](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/fixture-sample-co-abc234)

**Demo video:** [youtu.be/Bm5Icjv39cQ](https://youtu.be/Bm5Icjv39cQ)

## Try it (judges)

The sample report is live without an API call and includes the score, deterministic estimate, recommended starting automation, visibility results, and [raw JSON](https://opportunity-snapshot.airevenuestack-jason.workers.dev/api/snapshot/fixture-sample-co-abc234.json).

Verified model-backed reports spanning the scoring range:

- Strong presence: [Legacy Plumbing - 72](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/legacy-plumbing-wmfdyv)
- Middle presence: [T-Rock Roofing - 60](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/t-rock-roofing-7vpa2d)
- Thin presence: [Jessi James Project Pro - 32](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/jessi-james-project-pro-ucvpu3)
- Stability rerun: [T-Rock Roofing - 59](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/t-rock-roofing-3xez8w), in the same `Findable but manual` band

Or use any local service business you know. Each run takes about one to two minutes and produces a shareable URL. Raw data for a generated report is available at `/api/snapshot/<slug>.json`.

## How GPT-5.6 is used

- Live research: the Responses API with the `web_search` tool cross-checks the business site against the public web.
- AI visibility: five real consumer questions run through GPT-5.6 web search. The report shows who AI recommends instead and why.
- Analysis: strict JSON-schema structured outputs score the business against a pinned rubric for stable bands across reruns.
- GPT-5.6 is not allowed to produce dollar figures. All revenue math is deterministic TypeScript from a printed assumptions table, hard-capped at 25% of estimated current volume.
- Usage is metered per run, including web-search calls, and generation stops when the configured estimated cost ceiling is crossed.
- The production request stays connected until generation finishes so Cloudflare does not cancel long model-backed work after returning a response.

## How Codex was used

Codex built the application task by task in one primary session: repository setup, unit tests, the framework-independent pipeline, OpenAI Responses integration, Cloudflare persistence, the CLI, the Astro interface, and deployment. It used test-first loops for the business rules and failure modes, then verified the rendered application in a real browser at desktop and mobile sizes. Live golden runs exposed Cloudflare's 30-second detached-work limit, an outdated model-price estimate, and overly verbose visibility fields. Codex reproduced each issue, added regression tests, deployed the corrections, and reran the reports.

The builder supplied the product design, scoring bands, conservative vertical assumptions, brand constraints, and deployment goal. Codex made implementation decisions inside those boundaries, including updating the original Astro 5 plan to the current Astro 6 adapter contract, pricing web-search calls in the run ceiling, bounding downloaded page bodies, rejecting private-network URLs, hashing rate-limit identities, and adding a zero-credit sample report. Official OpenAI and Cloudflare documentation was checked where shipped APIs had moved beyond the written plan.

## Architecture

```text
intake
  -> bounded site fetch
  -> research (GPT-5.6 + web search)
  -> visibility x5 (GPT-5.6 + web search)
  -> analysis (GPT-5.6 structured output + pinned rubric)
  -> ROI estimate (deterministic TypeScript + 25% cap)
  -> Cloudflare KV
  -> shareable report + raw JSON
```

The pipeline under `src/lib/` has no Astro dependency. The web API and CLI call the same orchestration code, and the fixture path renders without an OpenAI key.

## Run locally

Requirements: Node.js 22.12 or newer.

```bash
npm install
cp .dev.vars.example .dev.vars
# Add OPENAI_API_KEY to .dev.vars for real model-backed runs.
npm run dev
```

On PowerShell, use `Copy-Item .dev.vars.example .dev.vars` instead of `cp`.

```bash
# Real CLI run
npm run snapshot -- --name "Acme HVAC" --url https://example.com --city "Plano, TX" --vertical hvac

# Zero-credit fixture, unit suite, type checks, and Worker build
npm run snapshot:test
npm test
npm run check
npm run build
```

Production uses the `SNAPSHOTS` KV binding and an `OPENAI_API_KEY` Worker secret. Set secrets interactively with Wrangler so they never enter shell history or Git.

## License

MIT
