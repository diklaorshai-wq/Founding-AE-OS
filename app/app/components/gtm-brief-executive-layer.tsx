import type { GtmBriefExecutive } from "../types/gtm-brief";
import { GtmBriefBulletList } from "./gtm-brief-bullet-list";
import { GtmBriefDecisionCard } from "./gtm-brief-decision-card";

type GtmBriefExecutiveLayerProps = {
  executive: GtmBriefExecutive;
};

export function GtmBriefExecutiveLayer({ executive }: GtmBriefExecutiveLayerProps) {
  return (
    <div className="border-b border-zinc-200/80 bg-zinc-50/60 px-6 py-6 sm:px-8 sm:py-8">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Opportunity Score
            </p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
                {executive.opportunityScore}
              </span>
              <span className="pb-1.5 text-lg font-medium text-zinc-400">
                /100
              </span>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            {executive.opportunityLabel}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
          {executive.opportunityExplanation}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GtmBriefDecisionCard title="Why this account">
          <GtmBriefBulletList items={executive.whyThisAccount} />
        </GtmBriefDecisionCard>

        <GtmBriefDecisionCard title="Top pain">
          <GtmBriefBulletList items={executive.topPain} />
        </GtmBriefDecisionCard>

        <GtmBriefDecisionCard title="Best first persona">
          <p className="font-medium text-zinc-950">
            {executive.bestFirstPersona.title}
          </p>
          <p className="mt-2">{executive.bestFirstPersona.whyTheyMatter}</p>
        </GtmBriefDecisionCard>

        <GtmBriefDecisionCard title="Recommended next action">
          <p>{executive.recommendedNextAction}</p>
        </GtmBriefDecisionCard>
      </div>
    </div>
  );
}
