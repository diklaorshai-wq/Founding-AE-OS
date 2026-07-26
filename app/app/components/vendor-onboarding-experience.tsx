"use client";

/**
 * Checkpoint C: Vendor Onboarding experience.
 *
 * Vendor URL → /api/vendor/research → refine → approve → localStorage.
 * Does not wire target-company evaluation.
 */
import { FormEvent, useState, useSyncExternalStore } from "react";
import type { VendorProfile } from "../lib/intelligence/vendorProfile";
import type { CanonicalVendorResearchResult } from "../lib/intelligence/vendorResearchService";
import {
  clearApprovedVendorProfile,
  getApprovedVendorProfileServerSnapshot,
  getApprovedVendorProfileSnapshot,
  subscribeApprovedVendorProfile,
} from "../lib/intelligence/approvedVendorProfileStorage";
import {
  normalizeVendorWebsiteUrl,
  persistApprovedVendorProfile,
  shouldOpenRefinement,
  toSafeResearchErrorMessage,
  type VendorOnboardingPhase,
} from "../lib/intelligence/vendorOnboardingFlow";
import { VendorRefinementMode } from "./vendor-refinement-mode";

type ResearchResponseBody = CanonicalVendorResearchResult & {
  errorDetails?: { code: string; message: string };
};

export function VendorOnboardingExperience() {
  const storedApproved = useSyncExternalStore(
    subscribeApprovedVendorProfile,
    getApprovedVendorProfileSnapshot,
    getApprovedVendorProfileServerSnapshot,
  );

  /** Session overlay — null means derive from storage (approved vs idle). */
  const [sessionPhase, setSessionPhase] = useState<VendorOnboardingPhase | null>(null);
  const [url, setUrl] = useState("");
  const [urlValidationError, setUrlValidationError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [approvalErrors, setApprovalErrors] = useState<string[]>([]);
  const [draftProfile, setDraftProfile] = useState<VendorProfile | null>(null);
  /** True while researching a replacement; approved storage is not cleared until new approval. */
  const [replacingApproved, setReplacingApproved] = useState(false);

  const approvedProfile = storedApproved;
  const phase: VendorOnboardingPhase =
    sessionPhase ?? (approvedProfile && !replacingApproved ? "approved" : "idle");

  async function runResearch(event?: FormEvent) {
    event?.preventDefault();
    if (phase === "researching") {
      return;
    }

    const normalized = normalizeVendorWebsiteUrl(url);
    if (!normalized.ok) {
      setUrlValidationError(normalized.message);
      setSessionPhase(sessionPhase === "failed" ? "failed" : "idle");
      return;
    }

    setUrl(normalized.url);
    setUrlValidationError("");
    setSessionPhase("researching");
    setErrorMessage("");
    setApprovalErrors([]);
    setDraftProfile(null);

    let response: Response;
    try {
      response = await fetch("/api/vendor/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized.url }),
      });
    } catch {
      setErrorMessage(toSafeResearchErrorMessage({ networkError: true }));
      setSessionPhase("failed");
      return;
    }

    let body: ResearchResponseBody;
    try {
      body = (await response.json()) as ResearchResponseBody;
    } catch {
      setErrorMessage(toSafeResearchErrorMessage({ status: response.status }));
      setSessionPhase("failed");
      return;
    }

    if (!response.ok || body.status === "failed" || !shouldOpenRefinement(body.status)) {
      setErrorMessage(
        toSafeResearchErrorMessage({
          status: response.status,
          failureReason: body.failureReason ?? body.errorDetails?.message,
        }),
      );
      setSessionPhase("failed");
      return;
    }

    if (!body.profileData) {
      setErrorMessage(toSafeResearchErrorMessage({ failureReason: body.failureReason }));
      setSessionPhase("failed");
      return;
    }

    setDraftProfile(body.profileData);
    setSessionPhase("refining");
  }

  function handleApprove(profile: VendorProfile) {
    const result = persistApprovedVendorProfile(profile);
    if (!result.ok) {
      setApprovalErrors(result.errors);
      setSessionPhase("refining");
      return;
    }

    setApprovalErrors([]);
    setDraftProfile(null);
    setReplacingApproved(false);
    setUrl("");
    setSessionPhase(null);
  }

  function handleClearApproved() {
    clearApprovedVendorProfile();
    setDraftProfile(null);
    setReplacingApproved(false);
    setUrl("");
    setErrorMessage("");
    setApprovalErrors([]);
    setSessionPhase("idle");
  }

  function handleReviewEdit() {
    if (!approvedProfile) {
      return;
    }
    setDraftProfile(approvedProfile);
    setReplacingApproved(false);
    setApprovalErrors([]);
    setSessionPhase("refining");
  }

  function requestReplace() {
    setSessionPhase("confirmReplace");
  }

  function cancelReplace() {
    setReplacingApproved(false);
    setSessionPhase(null);
  }

  function confirmReplace() {
    // Keep storage until a new profile is approved.
    setReplacingApproved(true);
    setDraftProfile(null);
    setErrorMessage("");
    setApprovalErrors([]);
    setUrl("");
    setSessionPhase("idle");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="max-w-3xl space-y-1">
        <p className="text-sm font-medium tracking-tight text-zinc-500">GTM Brain</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Vendor Profile Onboarding
        </h1>
        <p className="text-sm text-zinc-500">
          Research your public website, refine the draft, and approve a Vendor Profile for later
          account evaluation.
        </p>
      </header>

      {replacingApproved && approvedProfile && phase !== "approved" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Replacing{" "}
          <span className="font-medium">{approvedProfile.vendorName || "your approved profile"}</span>.
          The current approved profile stays saved until you approve a new one.
        </div>
      )}

      {(phase === "idle" || phase === "failed") && (
        <section className="max-w-2xl space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <form onSubmit={runResearch} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Vendor website</span>
              <input
                type="text"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (urlValidationError) {
                    setUrlValidationError("");
                  }
                }}
                placeholder="snowflake.com or https://www.snowflake.com"
                autoComplete="url"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>
            {urlValidationError && (
              <p role="alert" className="text-sm text-red-600">
                {urlValidationError}
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Enter a domain or full URL. No pasted documents required — GTM Brain researches your
              public website automatically.
            </p>
            <button
              type="submit"
              disabled={url.trim().length === 0}
              className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Research my company
            </button>
          </form>

          {phase === "failed" && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Research could not be completed</p>
              <p className="mt-1">{errorMessage}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runResearch()}
                  className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSessionPhase("idle");
                    setErrorMessage("");
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700"
                >
                  Edit URL
                </button>
              </div>
            </div>
          )}

          {replacingApproved && (
            <button
              type="button"
              onClick={() => {
                setReplacingApproved(false);
                setSessionPhase(null);
              }}
              className="text-xs font-medium text-zinc-600 underline"
            >
              Cancel and keep current approved profile
            </button>
          )}
        </section>
      )}

      {phase === "researching" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-sm font-medium text-zinc-950">Researching your company…</p>
          <p className="mt-2 text-sm text-zinc-500">
            GTM Brain is reading your public website to draft a Vendor Profile. This usually takes a
            short moment.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 rounded-xl bg-zinc-400 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Researching…
          </button>
        </section>
      )}

      {phase === "refining" && draftProfile && (
        <section className="w-full space-y-3">
          {approvalErrors.length > 0 && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Could not save the approved profile</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {approvalErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <VendorRefinementMode initialProfile={draftProfile} onApprove={handleApprove} />
        </section>
      )}

      {phase === "confirmReplace" && approvedProfile && (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">Research another vendor?</h2>
          <p className="text-sm text-zinc-600">
            Your current approved profile for{" "}
            <span className="font-medium">{approvedProfile.vendorName}</span> will stay saved until
            you approve a replacement. Nothing is overwritten by starting research alone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmReplace}
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Continue to research a replacement
            </button>
            <button
              type="button"
              onClick={cancelReplace}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {phase === "approved" && approvedProfile && (
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Approved Vendor Profile
            </p>
            <h2 className="text-xl font-semibold text-zinc-950">
              {approvedProfile.vendorName || "Untitled vendor"}
            </h2>
            <p className="text-sm text-zinc-600">
              {approvedProfile.websiteUrl || "No website URL on file"}
            </p>
            <p className="text-sm text-zinc-500">
              This profile is saved in this browser and ready for future account evaluation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReviewEdit}
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Review / Edit profile
            </button>
            <button
              type="button"
              onClick={requestReplace}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Research / replace with another vendor
            </button>
            <button
              type="button"
              onClick={handleClearApproved}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700"
            >
              Clear approved profile
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
