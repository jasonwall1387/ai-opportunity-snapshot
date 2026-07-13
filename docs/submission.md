# Build Week submission checklist

## Current build status

- Live Worker: <https://opportunity-snapshot.airevenuestack-jason.workers.dev>
- Public sample report: <https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/fixture-sample-co-abc234>
- Public repository: <https://github.com/jasonwall1387/ai-opportunity-snapshot>
- Model-backed generation: live with `OPENAI_API_KEY` stored as a Worker secret
- Golden runs: complete across strong, middle, and thin web presences

## Verified golden reports

- Strong: [Legacy Plumbing - 72, Responsive, partially automated](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/legacy-plumbing-wmfdyv)
- Middle: [T-Rock Roofing - 60, Findable but manual](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/t-rock-roofing-7vpa2d)
- Thin: [Jessi James Project Pro - 32, Basic presence](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/jessi-james-project-pro-ucvpu3)
- Stability: [T-Rock Roofing rerun - 59, Findable but manual](https://opportunity-snapshot.airevenuestack-jason.workers.dev/s/t-rock-roofing-3xez8w)

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
- [x] Run three golden businesses spanning strong, average, and thin web presence.
- [x] Rerun the middle business and confirm both runs land in the same score band.
- [x] Set the production `OPENAI_API_KEY` from Infisical as a Worker secret.
- [x] Confirm the repository is public, the MIT license is present, and the README is current.
- [x] Verify the README from a clean public clone: install, tests, fixture snapshot, and local dev HTTP 200.
- [x] Confirm no key-like string exists in history: `git log -p | rg -i "sk-[a-z0-9_-]{20,}"`.
- [ ] Submit before Tuesday, July 21, 2026 at 5:00 PM PT. Target July 20 for buffer.
