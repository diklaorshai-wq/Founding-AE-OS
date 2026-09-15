"use client";

import type { FinalEvaluationResponse } from "../lib/intelligence/types/contracts";
import { toEvaluateResultViewModel } from "../lib/intelligence/companyEvaluateResult";

type EvaluateResultProps = {
  response: FinalEvaluationResponse;
  targetLabel: string;
  workspace?: boolean;
};

const GROUP_LABELS = {
  whyThem: "Why Them",
  whyNow: "Why Now",
  whyUs: "Why Us",
} as const;

export function EvaluateResult({
  response,
  targetLabel,
  workspace = false,
}: EvaluateResultProps) {
  const view = toEvaluateResultViewModel(response);

  if (!view) {
    return (
      <article
        className={`w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 ${
          workspace ? "max-w-none" : "max-w-2xl"
        }`}
        role="alert"
      >
        The evaluation response was incomplete and could not be displayed.
      </article>
    );
  }

  const groups = [
    ["whyThem", view.evidenceByGroup.whyThem],
    ["whyNow", view.evidenceByGroup.whyNow],
    ["whyUs", view.evidenceByGroup.whyUs],
  ] as const;

  return (
    <article
      className={`w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/60 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] ${
        workspace ? "max-w-none" : "max-w-2xl"
      }`}
    >
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Account evaluation
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">{targetLabel}</h2>
      </header>

      <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Recommendation</h3>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            {view.decisionOutcome}
          </p>
          {view.recommendedFirstMove ? (
            <p className="mt-3 text-sm text-zinc-600">{view.recommendedFirstMove}</p>
          ) : null}
        </section>

        {view.curatedReasons.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Why this decision</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-700">
              {view.curatedReasons.map((reason) => (
                <li key={reason.evaluationId}>{reason.text}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Evidence by decision group</h3>
          <div className="mt-3 space-y-4">
            {groups.map(([groupKey, items]) => (
              <div key={groupKey}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {GROUP_LABELS[groupKey]}
                </h4>
                {items.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-400">No evidence in this group.</p>
                ) : (
                  <ul className="mt-1 space-y-2">
                    {items.map((item, index) => (
                      <li
                        key={`${groupKey}-${index}-${item.claim.slice(0, 24)}`}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                      >
                        <p>{item.claim}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.decisionImpact}
                          {item.natureOfConnection ? ` · ${item.natureOfConnection}` : ""}
                          {item.source ? ` · ${item.source}` : ""}
                          {item.date ? ` · ${item.date}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
