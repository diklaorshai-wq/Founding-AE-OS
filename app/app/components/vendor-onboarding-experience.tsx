"use client";

import Link from "next/link";
import { useState } from "react";
import {
  applyVendorOnboardingResponse,
  createEmptyVendorProfile,
  type VendorOnboardingResponse,
} from "../lib/intelligence/vendorOnboarding";
import type {
  RedFlagDecisionGroup,
  VendorProfile,
} from "../lib/intelligence/vendorProfile";
import { validateVendorProfile } from "../lib/intelligence/vendorProfileValidation";

const stages = [
  { title: "Your offering", eyebrow: "What do you sell?" },
  { title: "Customer value", eyebrow: "What changes for the customer?" },
  { title: "Proof", eyebrow: "Why should customers believe you?" },
  { title: "Ideal customer", eyebrow: "Which companies fit best?" },
  { title: "Personas", eyebrow: "Who should the AE engage?" },
  { title: "Why now", eyebrow: "What creates urgency?" },
  { title: "Red flags", eyebrow: "When should the AE be careful?" },
] as const;

type Answers = {
  vendorName: string;
  offering: string;
  problems: string;
  outcomes: string;
  buyingReasons: string;
  capabilities: string;
  useCases: string;
  alternatives: string;
  differentiation: string;
  proofPoints: string;
  criteria: string;
  examples: string;
  firmographicDisqualifiers: string;
  personas: string;
  whyNowSignals: string;
  cautionaryFlags: string;
  whyUsDisqualifiers: string;
};

const emptyAnswers: Answers = {
  vendorName: "",
  offering: "",
  problems: "",
  outcomes: "",
  buyingReasons: "",
  capabilities: "",
  useCases: "",
  alternatives: "",
  differentiation: "",
  proofPoints: "",
  criteria: "",
  examples: "",
  firmographicDisqualifiers: "",
  personas: "",
  whyNowSignals: "",
  cautionaryFlags: "",
  whyUsDisqualifiers: "",
};

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pair(value: string): [string, string] {
  const [first, ...rest] = value.split(/\s+[—-]\s+/);
  return [first.trim(), rest.join(" — ").trim()];
}

function makeId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function buildResponse(
  step: number,
  answers: Answers,
  profile: VendorProfile,
): VendorOnboardingResponse {
  const knowledge = profile.productKnowledge;

  switch (step) {
    case 0:
      return { stage: "offering", offering: answers.offering.trim() };
    case 1: {
      const customerProblems = lines(answers.problems).map((statement, index) => ({
        id: makeId("problem", index),
        statement,
      }));
      const problemIds = customerProblems.map(({ id }) => id);
      const desiredOutcomes = lines(answers.outcomes).map((statement, index) => ({
        id: makeId("outcome", index),
        statement,
        problemIds,
      }));
      const outcomeIds = desiredOutcomes.map(({ id }) => id);
      const capabilities = lines(answers.capabilities).map((entry, index) => {
        const [name, description] = pair(entry);
        return {
          id: makeId("capability", index),
          name,
          description: description || name,
          problemIds,
          outcomeIds,
        };
      });
      const capabilityIds = capabilities.map(({ id }) => id);
      const useCases = lines(answers.useCases).map((entry, index) => {
        const [name, description] = pair(entry);
        return {
          id: makeId("use-case", index),
          name,
          description: description || name,
          problemIds,
          outcomeIds,
          capabilityIds,
        };
      });
      const commonAlternatives = lines(answers.alternatives).map((entry, index) => {
        const [name, description] = pair(entry);
        return {
          id: makeId("alternative", index),
          name,
          description: description || name,
        };
      });

      return {
        stage: "value",
        customerProblems,
        desiredOutcomes,
        buyingReasons: lines(answers.buyingReasons).map((statement, index) => ({
          id: makeId("buying-reason", index),
          statement,
          outcomeIds,
        })),
        capabilities,
        useCases,
        commonAlternatives,
        relevantDifferentiation: lines(answers.differentiation).map(
          (statement, index) => ({
            id: makeId("differentiation", index),
            statement,
            alternativeIds: commonAlternatives.map(({ id }) => id),
            problemIds,
            outcomeIds,
          }),
        ),
      };
    }
    case 2:
      return {
        stage: "proof",
        proofPoints: lines(answers.proofPoints).map((entry, index) => {
          const [summary, metric] = pair(entry);
          return {
            id: makeId("proof", index),
            summary,
            metric: metric || undefined,
            outcomeIds: knowledge.desiredOutcomes.map(({ id }) => id),
            useCaseIds: knowledge.useCases.map(({ id }) => id),
          };
        }),
      };
    case 3: {
      const criteria = lines(answers.criteria).map((description, index) => ({
        id: makeId("criterion", index),
        description,
      }));
      return {
        stage: "idealCustomer",
        idealCustomerProfile: {
          criteria,
          examples: lines(answers.examples).map((entry, index) => {
            const [companyName, rationale] = pair(entry);
            return {
              id: makeId("example", index),
              companyName,
              rationale: rationale || "Represents a strong ideal-customer fit.",
              criterionIds: criteria.map(({ id }) => id),
              relationship: "example-only" as const,
            };
          }),
          firmographicDisqualifiers: lines(answers.firmographicDisqualifiers).map(
            (entry, index) => {
              const [condition, whyItMatters] = pair(entry);
              return {
                id: makeId("firmographic-disqualifier", index),
                condition,
                whyItMatters: whyItMatters || "The account falls outside the ICP.",
              };
            },
          ),
        },
      };
    }
    case 4:
      return {
        stage: "personas",
        targetPersonas: lines(answers.personas).map((entry, index) => {
          const [roleOrTitle, firstMeetingAngle] = pair(entry);
          return {
            id: makeId("persona", index),
            roleOrTitle,
            problemIds: knowledge.customerProblems.map(({ id }) => id),
            outcomeIds: knowledge.desiredOutcomes.map(({ id }) => id),
            whyThisPersonaMatters: `Owns or influences the relevant customer problem as ${roleOrTitle}.`,
            firstMeetingAngle: firstMeetingAngle || `Lead with the outcomes relevant to ${roleOrTitle}.`,
          };
        }),
      };
    case 5:
      return {
        stage: "whyNow",
        whyNowSignals: lines(answers.whyNowSignals).map((entry, index) => {
          const [signal, whyItMatters] = pair(entry);
          return {
            id: makeId("why-now", index),
            signal,
            whyItMatters: whyItMatters || "Creates a timely reason to investigate the account.",
            problemIds: knowledge.customerProblems.map(({ id }) => id),
            outcomeIds: knowledge.desiredOutcomes.map(({ id }) => id),
            firstMeetingAngle: `Explore how ${signal.toLowerCase()} affects current priorities.`,
          };
        }),
      };
    default:
      return {
        stage: "redFlags",
        redFlags: [
          ...lines(answers.cautionaryFlags).map((entry, index) => {
            const [condition, whyItMatters] = pair(entry);
            return {
              id: makeId("caution", index),
              condition,
              whyItMatters: whyItMatters || "More evidence is required before investing AE time.",
              severity: "cautionary" as const,
              affectedDecisionGroups: [
                "whyThem",
                "whyUs",
              ] as RedFlagDecisionGroup[],
            };
          }),
          ...lines(answers.whyUsDisqualifiers).map((entry, index) => {
            const [condition, whyItMatters] = pair(entry);
            return {
              id: makeId("why-us-disqualifier", index),
              condition,
              whyItMatters: whyItMatters || "The vendor cannot create enough relevant value.",
              severity: "disqualifying" as const,
              affectedDecisionGroups: ["whyUs"] as RedFlagDecisionGroup[],
            };
          }),
        ],
      };
  }
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      {hint ? <span className="ml-2 text-xs text-zinc-400">{hint}</span> : null}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
      />
    </label>
  );
}

export function VendorOnboardingExperience() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [profile, setProfile] = useState(() =>
    createEmptyVendorProfile("vendor-profile", ""),
  );
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  const stage = stages[step];
  const update = (key: keyof Answers) => (value: string) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  function canContinue() {
    if (step === 0) return answers.vendorName.trim() && answers.offering.trim();
    if (step === 1)
      return answers.problems.trim() && answers.outcomes.trim() && answers.capabilities.trim();
    return true;
  }

  function continueOnboarding() {
    if (!canContinue()) {
      setMessage("Complete the essential fields before continuing.");
      return;
    }

    const response = buildResponse(step, answers, profile);
    const nextProfile = applyVendorOnboardingResponse(
      { ...profile, vendorName: answers.vendorName.trim() || profile.vendorName },
      response,
    );
    setProfile(nextProfile);
    setMessage("");

    if (step === stages.length - 1) {
      const errors = validateVendorProfile(nextProfile);
      if (errors.length > 0) {
        setMessage(errors[0]);
        return;
      }
      setComplete(true);
      return;
    }

    setStep((current) => current + 1);
  }

  function restart() {
    setAnswers(emptyAnswers);
    setProfile(createEmptyVendorProfile("vendor-profile", ""));
    setStep(0);
    setComplete(false);
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-[#f6f5f2] px-5 py-6 text-zinc-950 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            GTM Brain
          </Link>
          <span className="text-xs font-medium text-zinc-500">Vendor setup</span>
        </header>

        <div className="mt-8 h-1 overflow-hidden rounded-full bg-zinc-200 sm:mt-12">
          <div
            className="h-full rounded-full bg-zinc-950 transition-all duration-300"
            style={{ width: `${complete ? 100 : ((step + 1) / stages.length) * 100}%` }}
          />
        </div>

        <section className="mx-auto mt-8 max-w-3xl sm:mt-12">
          {complete ? (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-[0_24px_80px_rgba(0,0,0,0.07)] sm:p-12">
              <p className="text-sm font-medium text-emerald-700">Vendor Profile ready</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                GTM Brain has learned how {profile.vendorName} sells.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500">
                The profile is structurally valid and ready to guide Why Them, Why Now, Why Us, and the first-meeting recommendation.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <SummaryCard label="Customer problems" value={profile.productKnowledge.customerProblems.length} />
                <SummaryCard label="ICP criteria" value={profile.decisionStrategy.idealCustomerProfile.criteria.length} />
                <SummaryCard label="Why Now signals" value={profile.decisionStrategy.whyNowSignals.length} />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={restart} className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white">
                  Start again
                </button>
                <Link href="/" className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700">
                  Return to GTM Brain
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.07)] sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Step {step + 1} of {stages.length}
              </p>
              <p className="mt-5 text-sm font-medium text-zinc-500">{stage.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{stage.title}</h1>

              <div className="mt-8 space-y-5">{renderStage(step, answers, update)}</div>

              {message ? <p className="mt-5 text-sm font-medium text-red-600">{message}</p> : null}

              <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                  className="text-sm font-medium text-zinc-500 disabled:invisible"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={continueOnboarding}
                  className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white"
                >
                  {step === stages.length - 1 ? "Create Vendor Profile" : "Continue"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
    </div>
  );
}

function renderStage(
  step: number,
  answers: Answers,
  update: (key: keyof Answers) => (value: string) => void,
) {
  switch (step) {
    case 0:
      return (
        <>
          <TextField label="Company name" value={answers.vendorName} onChange={update("vendorName")} placeholder="Acme" rows={1} />
          <TextField label="In one sentence, what do you sell?" value={answers.offering} onChange={update("offering")} placeholder="A platform that helps..." rows={3} />
        </>
      );
    case 1:
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Customer problems" hint="one per line" value={answers.problems} onChange={update("problems")} placeholder={"Manual work slows the team\nLeaders lack visibility"} />
          <TextField label="Desired outcomes" hint="one per line" value={answers.outcomes} onChange={update("outcomes")} placeholder={"Move faster\nReduce operational risk"} />
          <TextField label="Why customers invest" hint="one per line" value={answers.buyingReasons} onChange={update("buyingReasons")} placeholder="The cost of the current process is growing" />
          <TextField label="Capabilities" hint="Name — what it enables" value={answers.capabilities} onChange={update("capabilities")} placeholder="Automated review — finds issues before release" />
          <TextField label="Use cases" hint="Name — practical workflow" value={answers.useCases} onChange={update("useCases")} placeholder="Pre-release review — validate every change" />
          <TextField label="Common alternatives" hint="Name — how it works today" value={answers.alternatives} onChange={update("alternatives")} placeholder="Manual review — senior employees check everything" />
          <div className="sm:col-span-2">
            <TextField label="Relevant differentiation" hint="one per line" value={answers.differentiation} onChange={update("differentiation")} placeholder="Our approach connects evidence to a clear business decision" />
          </div>
        </div>
      );
    case 2:
      return <TextField label="Proof points" hint="Evidence — metric or result" value={answers.proofPoints} onChange={update("proofPoints")} placeholder={"Customer reduced review time — 40% faster\nEnterprise deployment — 2,000 users"} rows={6} />;
    case 3:
      return (
        <>
          <TextField label="ICP criteria" hint="one per line" value={answers.criteria} onChange={update("criteria")} placeholder={"Enterprise company with a large engineering team\nComplex global operations"} />
          <TextField label="Ideal customer examples" hint="Company — why it is a strong example" value={answers.examples} onChange={update("examples")} placeholder="ExampleCo — large global team with a complex workflow" />
          <TextField label="Firmographic disqualifiers" hint="Condition — why it rules the account out" value={answers.firmographicDisqualifiers} onChange={update("firmographicDisqualifiers")} placeholder="Fewer than 50 employees — the problem is not complex enough" />
        </>
      );
    case 4:
      return <TextField label="Target personas" hint="Role — first-meeting angle" value={answers.personas} onChange={update("personas")} placeholder={"VP Engineering — discuss release velocity\nHead of Platform — discuss consistency across teams"} rows={6} />;
    case 5:
      return <TextField label="Observable Why Now signals" hint="Signal — why it matters" value={answers.whyNowSignals} onChange={update("whyNowSignals")} placeholder={"New VP Engineering — may revisit existing workflows\nRapid hiring — increases process complexity"} rows={6} />;
    default:
      return (
        <>
          <TextField label="Cautionary signals" hint="Condition — why more evidence is needed" value={answers.cautionaryFlags} onChange={update("cautionaryFlags")} placeholder="Unclear team size — validate the scale of the problem" />
          <TextField label="Why Us disqualifiers" hint="Condition — why we cannot create enough value" value={answers.whyUsDisqualifiers} onChange={update("whyUsDisqualifiers")} placeholder="Unsupported environment — the product cannot serve the workflow" />
        </>
      );
  }
}
