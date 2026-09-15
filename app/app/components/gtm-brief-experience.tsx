"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  getApprovedVendorProfileServerSnapshot,
  getApprovedVendorProfileSnapshot,
  subscribeApprovedVendorProfile,
} from "../lib/intelligence/approvedVendorProfileStorage";
import {
  missingApprovedVendorMessage,
  normalizeTargetCompanyUrl,
  requestCompanyEvaluate,
  type EvaluateExperienceStatus,
} from "../lib/intelligence/companyEvaluateClient";
import type { FinalEvaluationResponse } from "../lib/intelligence/types/contracts";
import { EvaluateResult } from "./evaluate-result";
import { GtmBriefForm } from "./gtm-brief-form";
import { GtmBriefLoading } from "./gtm-brief-loading";

type GtmBriefExperienceProps = {
  onStatusChange?: (status: EvaluateExperienceStatus) => void;
  workspace?: boolean;
};

export function GtmBriefExperience({
  onStatusChange,
  workspace = false,
}: GtmBriefExperienceProps = {}) {
  const approvedProfile = useSyncExternalStore(
    subscribeApprovedVendorProfile,
    getApprovedVendorProfileSnapshot,
    getApprovedVendorProfileServerSnapshot,
  );

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<EvaluateExperienceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTarget, setActiveTarget] = useState("");
  const [evaluation, setEvaluation] = useState<FinalEvaluationResponse | null>(null);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "loading") {
      return;
    }

    if (!approvedProfile) {
      setEvaluation(null);
      setErrorMessage(missingApprovedVendorMessage());
      setStatus("error");
      return;
    }

    const normalized = normalizeTargetCompanyUrl(url);
    if (!normalized.ok) {
      setEvaluation(null);
      setErrorMessage(normalized.message);
      setStatus("error");
      return;
    }

    setUrl(normalized.url);
    setActiveTarget(normalized.url);
    setEvaluation(null);
    setErrorMessage("");
    setStatus("loading");

    const result = await requestCompanyEvaluate({
      url: normalized.url,
      vendorProfile: approvedProfile,
    });

    if (!result.ok) {
      setEvaluation(null);
      setErrorMessage(result.message);
      setStatus("error");
      return;
    }

    setEvaluation(result.response);
    setStatus("complete");
  }

  const missingVendor = !approvedProfile;

  return (
    <div
      className={
        workspace ? "mt-6 w-full sm:mt-8" : "mt-12 w-full sm:mt-14"
      }
    >
      {missingVendor && (
        <div
          className="mx-auto mb-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950"
          role="status"
        >
          <p>{missingApprovedVendorMessage()}</p>
          <p className="mt-2">
            <a
              href="/vendor"
              className="font-medium text-zinc-950 underline underline-offset-2"
            >
              Onboard your Vendor Profile
            </a>
          </p>
        </div>
      )}

      <GtmBriefForm
        url={url}
        onUrlChange={setUrl}
        onSubmit={handleSubmit}
        isLoading={status === "loading"}
        disabled={missingVendor}
      />

      {status === "loading" && (
        <div className="mt-8 flex w-full justify-center">
          <GtmBriefLoading companyName={activeTarget || "this company"} />
        </div>
      )}

      {status === "error" && errorMessage && (
        <div
          className="mx-auto mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
          role="alert"
        >
          <p>{errorMessage}</p>
          {missingVendor && (
            <p className="mt-2">
              <a
                href="/vendor"
                className="font-medium underline underline-offset-2"
              >
                Go to /vendor
              </a>
            </p>
          )}
        </div>
      )}

      {status === "complete" && evaluation && (
        <div className={`flex w-full justify-center ${workspace ? "mt-3" : "mt-8"}`}>
          <EvaluateResult
            response={evaluation}
            targetLabel={activeTarget}
            workspace={workspace}
          />
        </div>
      )}
    </div>
  );
}
