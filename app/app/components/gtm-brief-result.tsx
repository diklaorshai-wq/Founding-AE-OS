import type { GtmBrief } from "../types/gtm-brief";
import { resolveExecutive } from "../lib/resolve-executive";
import { GtmBriefBulletList } from "./gtm-brief-bullet-list";
import { GtmBriefExecutiveLayer } from "./gtm-brief-executive-layer";
import { GtmBriefPersonaCard } from "./gtm-brief-persona";
import { GtmBriefSection } from "./gtm-brief-section";
import { GtmBriefWorkspaceHeader } from "./gtm-brief-workspace-header";
import { GtmBriefWorkspacePanel } from "./gtm-brief-workspace-panel";

type GtmBriefResultProps = {
  brief: GtmBrief;
  workspace?: boolean;
};

export function GtmBriefResult({ brief, workspace = false }: GtmBriefResultProps) {
  const executive = resolveExecutive(brief);

  return (
    <article
      className={`w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/60 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] ${
        workspace ? "max-w-none" : "max-w-2xl"
      }`}
    >
      <GtmBriefWorkspaceHeader
        companyName={brief.companyName}
        executive={executive}
      />

      <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <GtmBriefWorkspacePanel>
          <GtmBriefExecutiveLayer executive={executive} />
        </GtmBriefWorkspacePanel>

        <p className="px-1 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Detailed Brief
        </p>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Executive Summary">
            <p>{brief.executiveSummary}</p>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="ICP Fit">
            <p>{brief.icpFit}</p>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Why Now">
            <p>{brief.whyNow}</p>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Why Us">
            <p>{brief.whyUs}</p>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Buying Signals">
            <GtmBriefBulletList items={brief.buyingSignals} />
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="People to Talk To">
            <div className="space-y-4">
              {brief.peopleToTalkTo.map((persona) => (
                <GtmBriefPersonaCard key={persona.title} persona={persona} />
              ))}
            </div>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Suggested Outreach">
            <p>{brief.suggestedOutreach}</p>
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>

        <GtmBriefWorkspacePanel>
          <GtmBriefSection title="Discovery Questions">
            <GtmBriefBulletList items={brief.discoveryQuestions} />
          </GtmBriefSection>
        </GtmBriefWorkspacePanel>
      </div>
    </article>
  );
}
