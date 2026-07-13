# Build Week submission checklist

## Current build status

- Live Worker: <https://opportunity-snapshot.airevenuestack-jason.workers.dev>
- Public sample report: <https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/fixture-sample-co-abc234>
- Public repository: <https://github.com/jasonwall1387/ai-opportunity-snapshot>
- Model-backed generation: pending `OPENAI_API_KEY` as a Worker secret
- Golden runs: pending model-backed generation

## Submission actions

- [ ] Run `/feedback` in the primary Codex session and record the Session ID here.
- [ ] Record a public demo video under 3 minutes.
  - 0:00 - the problem: missed calls and weak AI visibility
  - 0:25 - live run on a real business
  - 1:10 - report walkthrough: score, estimated range and assumptions, first automation, visibility
  - 2:00 - implementation: Codex session tour and GPT-5.6 research and structured-output calls
  - 2:45 - close with the live link and track
  - Audio must explicitly cover how Codex and GPT-5.6 were used.
- [ ] Complete the Devpost form: Work & Productivity track, repository URL, live URL, video URL, and Session ID.
- [ ] Run three golden businesses spanning strong, average, and thin web presence.
- [ ] Rerun the middle business and confirm both runs land in the same score band.
- [ ] Set the production `OPENAI_API_KEY` interactively with `npx wrangler secret put OPENAI_API_KEY`.
- [ ] Confirm the repository is public, the MIT license is present, and the README is current.
- [ ] Confirm no key-like string exists in history: `git log -p | rg -i "sk-[a-z0-9_-]{20,}"`.
- [ ] Submit before Tuesday, July 21, 2026 at 5:00 PM PT. Target July 20 for buffer.
