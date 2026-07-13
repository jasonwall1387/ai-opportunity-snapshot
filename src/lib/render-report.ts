import type { Snapshot } from './types.ts';
import { COPY } from './copy.ts';

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FORBIDDEN_REVIEW_WORD = new RegExp(`\\b${'aud' + 'it'}\\b`, 'gi');
const FORBIDDEN_CONSULTATION_PHRASE = new RegExp(`clarity ${'call'}`, 'gi');

function safeText(value: string): string {
  return esc(
    value
      .replace(/\u2014/g, ' - ')
      .replace(FORBIDDEN_REVIEW_WORD, 'review')
      .replace(FORBIDDEN_CONSULTATION_PHRASE, 'consultation'),
  );
}

const usd = (value: number) => `$${value.toLocaleString('en-US')}`;

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    visibility: 'AI visibility',
    leadCapture: 'Lead capture',
    reviews: 'Reviews',
    responsiveness: 'Responsiveness',
    automation: 'Automation',
  };
  return labels[key] ?? key;
}

function scoreSection(snapshot: Snapshot): string {
  const subScores = Object.entries(snapshot.score.sub)
    .map(([key, value]) => {
      const width = Math.max(0, Math.min(100, value));
      return `<div class="sub"><span class="sub-label">${safeText(labelFor(key))}</span>
        <div class="bar"><div class="fill" style="width:${width}%"></div></div>
        <span class="sub-val">${Math.round(value)}</span></div>`;
    })
    .join('');

  return `<section class="card score-card">
    <div class="score-ring"><span class="score-num">${Math.round(snapshot.score.total)}</span><span class="score-of">/100</span></div>
    <div class="score-meta"><h2>AI Readiness Score</h2><p class="band">${safeText(snapshot.score.band)}</p>${subScores}</div>
  </section>`;
}

function roiSection(snapshot: Snapshot): string {
  const rows = Object.entries(snapshot.roi.assumptions)
    .map(
      ([key, assumption]) =>
        `<tr><td>${safeText(key)}</td><td>${safeText(String(assumption.value))}</td><td class="src">${safeText(assumption.source)}</td></tr>`,
    )
    .join('');

  return `<section class="card">
    <h2>${safeText(COPY.estimateLabel)}</h2>
    <p class="roi-range">${usd(snapshot.roi.lowMonthly)} - ${usd(snapshot.roi.highMonthly)} <span class="per">estimated per month</span></p>
    ${snapshot.roi.capped ? '<p class="note">This estimate was capped by the 25% rule below.</p>' : ''}
    <p class="note">${safeText(COPY.estimateDisclosure)}</p>
    <details><summary>Estimated assumptions and formula</summary>
      <p class="formula">missed calls x new-lead share x recovery rate x close rate x average job value</p>
      <table class="assumptions"><thead><tr><th>Estimated assumption</th><th>Value</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>
    </details>
  </section>`;
}

function opportunitiesSection(snapshot: Snapshot): string {
  const items = snapshot.opportunities
    .map(
      (opportunity, index) => `<li>
        <div class="opp-head"><span class="opp-rank">${index + 1}</span><h3>${safeText(opportunity.title)}</h3>
        <span class="tag effort-${opportunity.effort}">effort: ${opportunity.effort}</span>
        <span class="tag impact-${opportunity.impact}">impact: ${opportunity.impact}</span></div>
        <p>${safeText(opportunity.description)}</p></li>`,
    )
    .join('');

  return `<section class="card">
    <h2>Top 5 automation opportunities</h2><ol class="opps">${items}</ol>
    <div class="first-pick"><h3>Start here: ${safeText(snapshot.firstAutomation.title)}</h3>
    <p>${safeText(snapshot.firstAutomation.why)}</p></div>
  </section>`;
}

function visibilitySection(snapshot: Snapshot): string {
  if (snapshot.visibility.questions.length === 0) {
    return `<section class="card"><h2>${safeText(COPY.visibilityHeading)}</h2>
      <p class="note">The visibility check could not be completed for this run.</p></section>`;
  }

  const rows = snapshot.visibility.questions
    .map(
      (question) => `<li class="${question.appeared ? 'hit' : 'miss'}">
        <p class="q">&quot;${safeText(question.q)}&quot;</p>
        <p class="verdict">${question.appeared ? 'You appeared' : 'You did not appear'}${
          question.winners.length
            ? ` - assistants named: ${safeText(question.winners.join(', '))}`
            : ''
        }</p>
        ${question.missing ? `<p class="missing">${safeText(question.missing)}</p>` : ''}</li>`,
    )
    .join('');

  return `<section class="card">
    <h2>${safeText(COPY.visibilityHeading)}</h2><ul class="vis">${rows}</ul>
    <p class="note">${safeText(COPY.visibilityDisclosure)}</p>
  </section>`;
}

export function renderReportHtml(snapshot: Snapshot): string {
  const warnings = snapshot.meta.warnings
    .map((warning) => `<p class="note warn">${safeText(warning)}</p>`)
    .join('');
  const displayUrl = safeText(snapshot.business.url);
  const city = snapshot.business.city ? ` | ${safeText(snapshot.business.city)}` : '';
  const date = new Date(snapshot.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' });

  return `<article class="report">
    <header class="report-head">
      <p class="kicker">${safeText(COPY.productName)}</p>
      <h1>${safeText(snapshot.business.name)}</h1>
      <p class="meta-line">${displayUrl}${city} | ${date}</p>
      ${snapshot.meta.limitedSiteData ? `<p class="note warn">${safeText(COPY.limitedDataNote)}</p>` : ''}
      ${warnings}
    </header>
    ${scoreSection(snapshot)}
    ${roiSection(snapshot)}
    ${opportunitiesSection(snapshot)}
    ${visibilitySection(snapshot)}
    <footer class="report-foot">
      <p>Generated by ${safeText(snapshot.meta.model)} with live web research. <a href="/api/snapshot/${encodeURIComponent(snapshot.slug)}.json">Raw data</a></p>
      <p><a href="${esc(COPY.footerUrl)}">${safeText(COPY.footerCredit)}</a></p>
    </footer>
  </article>`;
}
