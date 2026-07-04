import type { GtmBriefExecutive } from "../types/gtm-brief";

type GtmBriefWorkspaceHeaderProps = {
  companyName: string;
  executive: GtmBriefExecutive;
};

export function GtmBriefWorkspaceHeader({
  companyName,
  executive,
}: GtmBriefWorkspaceHeaderProps) {
  const priority = executive.priority || executive.opportunityLabel;

  return (
    <header className="flex flex-col gap-3 border-b border-zinc-200/80 bg-white px-6 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-8">
      <h2 className="shrink-0 text-base font-semibold tracking-tight text-zinc-950 sm:text-lg">
        {companyName}
      </h2>

      <div
        className="hidden h-4 w-px shrink-0 bg-zinc-200 sm:block"
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-zinc-950">
            {executive.opportunityScore}
            <span className="font-medium text-zinc-400">/100</span>
          </span>
          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {priority}
          </span>
        </div>

        <p className="min-w-0 truncate text-sm text-zinc-600">
          {executive.opportunityExplanation}
        </p>
      </div>
    </header>
  );
}
