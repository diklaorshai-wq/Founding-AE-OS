"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { getMockGtmBrief } from "../lib/mock-gtm-brief";
import type { GtmBrief, GtmBriefStatus } from "../types/gtm-brief";
import { GtmBriefForm } from "./gtm-brief-form";
import { GtmBriefLoading } from "./gtm-brief-loading";
import { GtmBriefResult } from "./gtm-brief-result";

const LOADING_DURATION_MS = 2000;

export function GtmBriefExperience() {
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<GtmBriefStatus>("idle");
  const [brief, setBrief] = useState<GtmBrief | null>(null);
  const [activeCompany, setActiveCompany] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCompany = company.trim();
    if (!trimmedCompany || status === "loading") {
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setActiveCompany(trimmedCompany);
    setBrief(null);
    setStatus("loading");

    timeoutRef.current = window.setTimeout(() => {
      setBrief(getMockGtmBrief(trimmedCompany));
      setStatus("complete");
      timeoutRef.current = null;
    }, LOADING_DURATION_MS);
  }

  return (
    <div className="mt-12 w-full sm:mt-14">
      <GtmBriefForm
        company={company}
        onCompanyChange={setCompany}
        onSubmit={handleSubmit}
        isLoading={status === "loading"}
      />

      {status === "loading" && (
        <div className="mt-8 flex w-full justify-center">
          <GtmBriefLoading companyName={activeCompany} />
        </div>
      )}

      {status === "complete" && brief && (
        <div className="mt-8 flex w-full justify-center">
          <GtmBriefResult brief={brief} />
        </div>
      )}
    </div>
  );
}
