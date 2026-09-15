"use client";

import { useState } from "react";
import type { EvaluateExperienceStatus } from "../lib/intelligence/companyEvaluateClient";
import { GtmBriefExperience } from "./gtm-brief-experience";

export function HomeContent() {
  const [isCompact, setIsCompact] = useState(false);

  function handleStatusChange(status: EvaluateExperienceStatus) {
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
              Does this account deserve outbound time now?
            </h1>

            <p
              className={`mt-5 max-w-md text-lg leading-relaxed text-pretty text-zinc-500 sm:text-xl sm:leading-relaxed ${
                isCompact ? "hidden" : ""
              }`}
            >
              Enter a target-company website. GTM Brain researches the account
              against your approved Vendor Profile and returns Invest, Monitor,
              or Skip.
            </p>
          </div>

          <div className={isCompact ? "w-full -mt-4 sm:-mt-6" : "w-full"}>
            <GtmBriefExperience
              onStatusChange={handleStatusChange}
              workspace={isCompact}
            />
          </div>

          {!isCompact && (
            <p className="mt-10 text-sm text-zinc-500">
              Setting up GTM Brain for your product?{" "}
              <a href="/vendor" className="font-medium text-zinc-900 underline underline-offset-2">
                Onboard your Vendor Profile
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
