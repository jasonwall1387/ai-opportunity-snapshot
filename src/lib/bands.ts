export const BANDS = [
  { min: 0, max: 20, label: 'Invisible' },
  { min: 21, max: 40, label: 'Basic presence' },
  { min: 41, max: 60, label: 'Findable but manual' },
  { min: 61, max: 80, label: 'Responsive, partially automated' },
  { min: 81, max: 100, label: 'AI-ready' },
] as const;

export function bandFor(score: number): string {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const band = BANDS.find(
    ({ min, max }) => clampedScore >= min && clampedScore <= max,
  );
  return band?.label ?? 'Invisible';
}

export const RUBRIC_TEXT = `AI Readiness Score rubric (0-100). Score strictly against these anchor bands so repeated runs on the same business land in the same band:
- 0-20 Invisible: little or no findable web presence; no reviews, no service pages, AI assistants cannot verify the business exists.
- 21-40 Basic presence: a website exists but is thin; few or stale reviews; no online booking or lead capture; AI assistants may find the name but cannot recommend confidently.
- 41-60 Findable but manual: solid site and some reviews; everything still depends on a human answering the phone; no automation, slow response signals.
- 61-80 Responsive, partially automated: good reviews and service pages plus at least one working automation (online booking, chat, missed-call text-back, review requests).
- 81-100 AI-ready: strong presence, active review flywheel, multiple automations, fast-response signals; AI assistants recommend it today.
Sub-scores (0-100 each) use the same anchors restricted to their dimension: visibility (can AI find and verify them), leadCapture (booking/forms/chat), reviews (volume, recency, rating), responsiveness (speed-to-lead signals), automation (working automated workflows).`;
