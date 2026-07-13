export interface SnapshotInput {
  name: string;
  url: string;
  city?: string;
  vertical?: string;
}

export interface ReviewPresence {
  platform: string;
  count: number | null;
  rating: number | null;
}

export interface Research {
  services: string[];
  serviceArea: string | null;
  booking: boolean;
  reviews: ReviewPresence[];
  signals: string[];
}

export interface VisibilityQuestion {
  q: string;
  appeared: boolean;
  winners: string[];
  sources: string[];
  missing: string;
}

export interface Visibility {
  engine: 'gpt-5.6-web-search';
  questions: VisibilityQuestion[];
}

export interface Opportunity {
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface SubScores {
  visibility: number;
  leadCapture: number;
  reviews: number;
  responsiveness: number;
  automation: number;
}

export interface Analysis {
  score: { total: number; sub: SubScores };
  opportunities: Opportunity[];
  firstAutomation: { title: string; why: string };
}

export interface RoiAssumption {
  value: number | string;
  source: string;
}

export interface RoiResult {
  lowMonthly: number;
  highMonthly: number;
  capped: boolean;
  assumptions: Record<string, RoiAssumption>;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
}

export interface Snapshot {
  slug: string;
  business: { name: string; url: string; city?: string; vertical: string };
  createdAt: string;
  score: { total: number; band: string; sub: SubScores };
  research: Research;
  visibility: Visibility;
  opportunities: Opportunity[];
  firstAutomation: { title: string; why: string };
  roi: RoiResult;
  meta: {
    model: string;
    usage: Usage;
    warnings: string[];
    limitedSiteData: boolean;
    durationMs: number;
  };
}

export type Stage =
  | 'queued'
  | 'researching'
  | 'checking-visibility'
  | 'analyzing'
  | 'done'
  | 'error';

export interface StatusRecord {
  stage: Stage;
  updatedAt: string;
  error?: string;
}
