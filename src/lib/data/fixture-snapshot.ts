import type { Snapshot } from '../types.ts';

export const FIXTURE_SNAPSHOT: Snapshot = {
  slug: 'fixture-sample-co-abc234',
  business: {
    name: 'Fixture Sample Co',
    url: 'https://example.com',
    city: 'Frisco, TX',
    vertical: 'hvac',
  },
  createdAt: '2026-07-13T12:00:00.000Z',
  score: {
    total: 47,
    band: 'Findable but manual',
    sub: { visibility: 38, leadCapture: 25, reviews: 68, responsiveness: 45, automation: 15 },
  },
  research: {
    services: ['AC repair', 'furnace installation', 'duct cleaning'],
    serviceArea: 'Frisco and Collin County, TX',
    booking: false,
    reviews: [
      { platform: 'Google', count: 87, rating: 4.6 },
      { platform: 'Yelp', count: 12, rating: 4.0 },
    ],
    signals: ['no chat widget', 'phone-only contact', 'no after-hours handling mentioned'],
  },
  visibility: {
    engine: 'gpt-5.6-web-search',
    questions: [
      {
        q: 'Who is the best hvac company in Frisco, TX?',
        appeared: false,
        winners: ['Comfort Kings', 'Frisco Air Pros'],
        sources: ['google.com/maps', 'yelp.com'],
        missing: 'Fewer recent reviews than the businesses that appeared.',
      },
      {
        q: 'I need my AC fixed today in Frisco, TX. Who should I call?',
        appeared: true,
        winners: ['Fixture Sample Co', 'Comfort Kings'],
        sources: ['google.com/maps'],
        missing: 'Appeared, but without same-day booking the mention is weak.',
      },
      {
        q: 'Recommend a few hvac companies near Frisco, TX with good reviews.',
        appeared: false,
        winners: ['Comfort Kings', 'Frisco Air Pros', 'North Star HVAC'],
        sources: ['yelp.com', 'bbb.org'],
        missing: 'Review volume is below the local leaders.',
      },
      {
        q: 'Is Fixture Sample Co in Frisco, TX reputable? What do people say about them?',
        appeared: true,
        winners: ['Fixture Sample Co'],
        sources: ['google.com/maps'],
        missing: 'Reputation confirmed, but few reviews are recent.',
      },
      {
        q: 'Which hvac companies in Frisco, TX let me book online?',
        appeared: false,
        winners: ['Frisco Air Pros'],
        sources: ['friscoairpros.example'],
        missing: 'No online booking on the website.',
      },
    ],
  },
  opportunities: [
    {
      title: 'Missed-call text-back',
      description:
        'Reply automatically by text when a call goes unanswered so the lead does not move on.',
      effort: 'low',
      impact: 'high',
    },
    {
      title: 'Online booking on the website',
      description: 'Let customers pick a time slot themselves instead of waiting for a callback.',
      effort: 'medium',
      impact: 'high',
    },
    {
      title: 'Automated review requests',
      description: 'Text every finished job a review link. Volume and recency drive AI recommendations.',
      effort: 'low',
      impact: 'medium',
    },
    {
      title: 'After-hours answering flow',
      description: 'An automated assistant captures emergency calls at night instead of voicemail.',
      effort: 'medium',
      impact: 'medium',
    },
    {
      title: 'Service pages per city',
      description: 'One page per service per city so assistants can verify what you do and where.',
      effort: 'medium',
      impact: 'medium',
    },
  ],
  firstAutomation: {
    title: 'Missed-call text-back',
    why: 'It recovers revenue from leads already calling you. It needs no website changes and can show results in the first week.',
  },
  roi: {
    lowMonthly: 510,
    highMonthly: 4101,
    capped: false,
    assumptions: {
      'Average job value estimate': {
        value: '$350 - $900',
        source: 'Conservative industry estimate',
      },
      'Monthly inbound calls estimate': {
        value: '80 - 250',
        source: 'Conservative industry estimate',
      },
      'Missed-call rate estimate': { value: 0.27, source: 'Conservative industry estimate' },
      'Share of calls that are new leads': {
        value: 0.45,
        source: 'Conservative industry estimate',
      },
      'Recovery rate with automation': {
        value: 0.3,
        source: 'Conservative industry estimate',
      },
      'Close rate on recovered leads': {
        value: 0.5,
        source: 'Conservative industry estimate',
      },
      'Cap - 25% of estimated current new-job revenue': {
        value: '25 - 90 jobs/mo',
        source: 'Hard cap so the estimate can never exceed a quarter of current volume',
      },
    },
  },
  meta: {
    model: 'gpt-5.6',
    usage: { inputTokens: 48210, outputTokens: 6180, estCostUsd: 0.27 },
    warnings: [],
    limitedSiteData: false,
    durationMs: 71000,
  },
};
