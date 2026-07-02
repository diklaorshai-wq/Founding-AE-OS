"use client";

import { useEffect, useState } from "react";

const LOADING_STEPS = [
  "Researching account...",
  "Analyzing ICP fit and timing...",
  "Synthesizing GTM brief...",
] as const;

const STEP_DURATION_MS = 650;

type GtmBriefLoadingProps = {
  companyName: string;
};

export function GtmBriefLoading({ companyName }: GtmBriefLoadingProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) =>
        current < LOADING_STEPS.length - 1 ? current + 1 : current,
      );
    }, STEP_DURATION_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full max-w-2xl rounded-2xl border border-zinc-200/80 bg-white px-6 py-8 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:px-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-zinc-950" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-950">
            GTM Brain is analyzing {companyName}
          </p>
          <p className="mt-2 text-sm text-zinc-500">{LOADING_STEPS[stepIndex]}</p>
          <div className="mt-5 flex gap-1.5">
            {LOADING_STEPS.map((step, index) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  index <= stepIndex ? "bg-zinc-950" : "bg-zinc-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
