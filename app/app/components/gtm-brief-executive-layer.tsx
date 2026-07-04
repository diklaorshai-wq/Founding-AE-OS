import type { GtmBriefExecutive } from "../types/gtm-brief";
import { GtmBriefBulletList } from "./gtm-brief-bullet-list";
import { GtmBriefDecisionCard } from "./gtm-brief-decision-card";

type GtmBriefExecutiveLayerProps = {
  executive: GtmBriefExecutive;
};

export function GtmBriefExecutiveLayer({ executive }: GtmBriefExecutiveLayerProps) {
  return (
    <div className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
