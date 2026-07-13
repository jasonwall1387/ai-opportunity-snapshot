import type { Research, Snapshot, SnapshotInput, Stage, Visibility } from './types.ts';
import type { SnapshotStore } from './store.ts';
import { CostCeilingError, type Llm } from './openai.ts';
import { fetchSite } from './fetch-site.ts';
import { runResearch } from './research.ts';
import { checkVisibility } from './visibility.ts';
import { runAnalysis } from './analyze.ts';
import { computeRoi } from './roi.ts';
import { bandFor } from './bands.ts';

export interface PipelineDeps {
  store: SnapshotStore;
  llm: Llm;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const EMPTY_RESEARCH: Research = {
  services: [],
  serviceArea: null,
  booking: false,
  reviews: [],
  signals: [],
};

const EMPTY_VISIBILITY: Visibility = { engine: 'gpt-5.6-web-search', questions: [] };

export async function runPipeline(
  input: SnapshotInput,
  slug: string,
  dependencies: PipelineDeps,
): Promise<Snapshot | null> {
  const { store, llm } = dependencies;
  const now = dependencies.now ?? (() => new Date());
  const started = now().getTime();
  const warnings: string[] = [];
  const setStage = (stage: Stage, error?: string) =>
    store.putStatus(slug, {
      stage,
      updatedAt: now().toISOString(),
      ...(error ? { error } : {}),
    });

  try {
    await setStage('researching');
    const site = await fetchSite(input.url, dependencies.fetchImpl ?? fetch).catch(() => ({
      text: null,
      pagesFetched: [],
      limited: true,
    }));

    let research = EMPTY_RESEARCH;
    try {
      research = await runResearch(llm, input, site);
    } catch (error) {
      if (error instanceof CostCeilingError) throw error;
      warnings.push('research stage failed; analysis is based on reduced evidence.');
    }

    await setStage('checking-visibility');
    let visibility = EMPTY_VISIBILITY;
    try {
      visibility = await checkVisibility(llm, input, research);
    } catch (error) {
      if (error instanceof CostCeilingError) throw error;
      warnings.push('visibility stage failed; the visibility section is omitted.');
    }

    await setStage('analyzing');
    const analysis = await runAnalysis(llm, input, research, visibility);
    const vertical = input.vertical ?? 'general';
    const snapshot: Snapshot = {
      slug,
      business: {
        name: input.name,
        url: input.url,
        ...(input.city ? { city: input.city } : {}),
        vertical,
      },
      createdAt: now().toISOString(),
      score: {
        total: analysis.score.total,
        band: bandFor(analysis.score.total),
        sub: analysis.score.sub,
      },
      research,
      visibility,
      opportunities: analysis.opportunities,
      firstAutomation: analysis.firstAutomation,
      roi: computeRoi(vertical),
      meta: {
        model: llm.model(),
        usage: llm.usage(),
        warnings,
        limitedSiteData: site.limited,
        durationMs: now().getTime() - started,
      },
    };

    await store.putSnapshot(slug, snapshot);
    await setStage('done');
    return snapshot;
  } catch (error) {
    const message =
      error instanceof CostCeilingError
        ? 'This run hit its cost ceiling and was stopped. Please try again later.'
        : 'Something went wrong while generating this report. Please try again.';
    await setStage('error', message);
    return null;
  }
}
