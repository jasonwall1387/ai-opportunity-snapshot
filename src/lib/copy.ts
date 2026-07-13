export const COPY = {
  productName: 'AI Opportunity Snapshot',
  tagline: 'See what AI already knows about your business - and what it could be doing for you.',
  intakeCta: 'Run my free Snapshot',
  progressHint: 'GPT-5.6 is researching your business live. This takes about a minute.',
  estimateLabel: 'Estimated monthly revenue left on the table',
  estimateDisclosure:
    'This is an estimate computed from the assumptions printed below, not a promise. Edit any assumption mentally and the math scales with it.',
  visibilityHeading: 'Do AI assistants recommend you?',
  visibilityDisclosure:
    'Checked with GPT-5.6 web search (a single engine). Results on other AI assistants may differ.',
  limitedDataNote:
    'We could not read this website fully, so this report is based on public web data only.',
  footerCredit: 'Built by Revenue With AI',
  footerUrl: 'https://revenuewithai.com',
  shareLabel: 'Copy report link',
} as const;

const FORBIDDEN_REVIEW_WORD = new RegExp(`\\b${'aud' + 'it'}\\b`, 'i');
const FORBIDDEN_CONSULTATION_PHRASE = new RegExp(`clarity ${'call'}`, 'i');

export function violatesCopyRules(text: string): string[] {
  const issues: string[] = [];
  if (text.includes('\u2014')) issues.push('em dash found');
  if (FORBIDDEN_REVIEW_WORD.test(text)) issues.push('the banned review word found');
  if (FORBIDDEN_CONSULTATION_PHRASE.test(text)) {
    issues.push('the banned consultation phrase found');
  }
  return issues;
}
