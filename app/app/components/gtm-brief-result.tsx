import type { GtmBrief } from "../types/gtm-brief";
import { resolveExecutive } from "../lib/resolve-executive";
import { GtmBriefBulletList } from "./gtm-brief-bullet-list";
import { GtmBriefExecutiveLayer } from "./gtm-brief-executive-layer";
import { GtmBriefPersonaCard } from "./gtm-brief-persona";
import { GtmBriefSection } from "./gtm-brief-section";

type GtmBriefResultProps = {
  brief: GtmBrief;
  workspace?: boolean;
};

export function GtmBriefResult({ brief, workspace = false }: GtmBriefResultProps) {
  const executive = resolveExecutive(brief);

  return (
    <article
      className={`w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] ${
        workspace ? "max-w-none" : "max-w-2xl"
      }`}
    >
      <header className="border-b border-zinc-200/80 px-6 py-5 sm:px-8">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          GTM Brief
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
          {brief.companyName}
        </h2>
      </header>

      <GtmBriefExecutiveLayer executive={executive} />

      <div className="border-b border-zinc-200/80 px-6 py-4 sm:px-8">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Detailed Brief
        </p>
      </div>

      <div className={workspace ? "lg:grid lg:grid-cols-2" : ""}>
        <GtmBriefSection title="Executive Summary">
          <p>{brief.executiveSummary}</p>
        </GtmBriefSection>

        <GtmBriefSection title="ICP Fit">
          <p>{brief.icpFit}</p>
        </GtmBriefSection>

        <GtmBriefSection title="Why Now">
          <p>{brief.whyNow}</p>
        </GtmBriefSection>

        <GtmBriefSection title="Why Us">
          <p>{brief.whyUs}</p>
        </GtmBriefSection>

        <GtmBriefSection title="Buying Signals">
          <GtmBriefBulletList items={brief.buyingSignals} />
        </GtmBriefSection>

        <GtmBriefSection title="People to Talk To">
          <div className="space-y-4">
            {brief.peopleToTalkTo.map((persona) => (
              <GtmBriefPersonaCard key={persona.title} persona={persona} />
            ))}
          </div>
        </GtmBriefSection>

        <GtmBriefSection title="Suggested Outreach">
          <p>{brief.suggestedOutreach}</p>
        </GtmBriefSection>

        <GtmBriefSection title="Discovery Questions">
          <GtmBriefBulletList items={brief.discoveryQuestions} />
        </GtmBriefSection>
      </div>
    </article>
  );
}
