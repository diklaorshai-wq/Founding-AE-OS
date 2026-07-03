"use client";

import { useState } from "react";
import type { GtmBriefStatus } from "../types/gtm-brief";
import { GtmBriefExperience } from "./gtm-brief-experience";

export function HomeContent() {
  const [isCompact, setIsCompact] = useState(false);

  function handleStatusChange(status: GtmBriefStatus) {
    setIsCompact(status === "complete");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans text-zinc-950">
      <main
        className={`flex flex-1 flex-col items-center justify-start px-6 sm:px-8 ${
          isCompact ? "py-6 sm:py-8" : "py-16 sm:py-24 lg:py-32"
        }`}
      >
        <div
          className={`flex w-full flex-col ${
            isCompact ? "max-w-7xl" : "max-w-2xl items-center text-center"
          }`}
        >
          <div
            className={
              isCompact ? "w-full max-w-2xl mx-auto text-center" : "w-full"
            }
          >
            <p
              className={`text-sm font-medium tracking-tight text-zinc-500 ${
                isCompact ? "mb-3" : "mb-8"
              }`}
            >
              GTM Brain
            </p>

            <h1
              className={`max-w-lg font-semibold tracking-tight text-balance ${
                isCompact
                  ? "mx-auto text-xl sm:text-2xl"
                  : "text-4xl sm:text-5xl sm:leading-[1.1]"
              }`}
            >
              Generate your GTM Brief
            </h1>

            <p
              className={`mt-5 max-w-md text-lg leading-relaxed text-pretty text-zinc-500 sm:text-xl sm:leading-relaxed ${
                isCompact ? "hidden" : ""
              }`}
            >
              Know why this account, why now, why us, who to engage, and how to
              win.
            </p>
          </div>

          <div className={isCompact ? "w-full -mt-2 sm:-mt-4" : "w-full"}>
            <GtmBriefExperience
              onStatusChange={handleStatusChange}
              workspace={isCompact}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
