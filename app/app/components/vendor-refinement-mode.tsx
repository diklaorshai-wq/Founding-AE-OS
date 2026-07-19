"use client";

/**
 * Step B of the two-stage Vendor Onboarding pipeline: "Refinement Mode".
 *
 * Renders the partial Vendor Profile that `researchVendorContent` (Step A)
 * drafted from raw sources — offering, capabilities, customerProblems,
 * desiredOutcomes, whyNowSignals, redFlags — as editable fields so the
 * Enterprise AE can correct AI mistakes, delete rows, or add their own
 * before anything is saved.
 *
 * All state and validation logic lives in `../lib/intelligence/
 * vendorRefinementDraft.ts` (kept DOM-free and separately unit-tested).
 * This component only wires that logic to inputs/textareas/buttons.
 *
 * Isolation boundaries:
 * - Does not import `recommendationEngine.ts`.
 * - Does not modify `types/contracts.ts` or the `VendorProfile` type
 *   definitions in `vendorProfile.ts`.
 * - "Approve & Save" invokes the real `validateVendorProfile` referential
 *   checks (via `validateRefinementDraft`) before calling `onApprove`, the
 *   caller-supplied save mechanism — there is no persisted-profile store
 *   yet, so persistence itself is intentionally left to the caller.
 */
import { useState } from "react";
import type {
  Capability,
  CustomerProblem,
  DesiredOutcome,
  RedFlag,
  RedFlagDecisionGroup,
  RedFlagSeverity,
  VendorProfile,
  WhyNowSignal,
} from "../lib/intelligence/vendorProfile";
import {
  buildRefinementDraft,
  createBlankCapability,
  createBlankCustomerProblem,
  createBlankDesiredOutcome,
  createBlankRedFlag,
  createBlankWhyNowSignal,
  formatIdList,
  parseIdList,
  validateRefinementDraft,
  type VendorIdentityDraft,
} from "../lib/intelligence/vendorRefinementDraft";

export interface VendorRefinementModeProps {
  /** The partial Vendor Profile produced by Step A's `researchVendorContent`. */
  initialProfile: Partial<VendorProfile>;
  /** Vendor identity captured in an earlier onboarding stage; defaults to blank values when omitted. */
  vendorIdentity?: Partial<VendorIdentityDraft>;
  /** Invoked with the fully-validated VendorProfile once "Approve & Save" succeeds. Wire this to the real persistence mechanism once one exists. */
  onApprove: (profile: VendorProfile) => void | Promise<void>;
}

type ProductKnowledgeListKey = "customerProblems" | "desiredOutcomes" | "capabilities";
type DecisionStrategyListKey = "whyNowSignals" | "redFlags";

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function RowCard({
  onRemove,
  removeLabel,
  children,
}: {
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-600 hover:text-red-700"
        >
          Remove {removeLabel}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  onAdd,
  addLabel,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
      >
        + Add {addLabel}
      </button>
    </div>
  );
}

export function VendorRefinementMode({
  initialProfile,
  vendorIdentity,
  onApprove,
}: VendorRefinementModeProps) {
  const [draft, setDraft] = useState<VendorProfile>(() =>
    buildRefinementDraft(initialProfile, vendorIdentity),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  function updateOffering(value: string) {
    setIsSaved(false);
    setDraft((prev) => ({
      ...prev,
      productKnowledge: { ...prev.productKnowledge, offering: value },
    }));
  }

  function updateProductKnowledgeList<K extends ProductKnowledgeListKey>(
    key: K,
    updater: (items: VendorProfile["productKnowledge"][K]) => VendorProfile["productKnowledge"][K],
  ) {
    setIsSaved(false);
    setDraft((prev) => ({
      ...prev,
      productKnowledge: { ...prev.productKnowledge, [key]: updater(prev.productKnowledge[key]) },
    }));
  }

  function updateDecisionStrategyList<K extends DecisionStrategyListKey>(
    key: K,
    updater: (items: VendorProfile["decisionStrategy"][K]) => VendorProfile["decisionStrategy"][K],
  ) {
    setIsSaved(false);
    setDraft((prev) => ({
      ...prev,
      decisionStrategy: { ...prev.decisionStrategy, [key]: updater(prev.decisionStrategy[key]) },
    }));
  }

  async function handleApprove() {
    setIsSaving(true);
    setIsSaved(false);
    const result = validateRefinementDraft(draft);
    setErrors(result.errors);

    if (result.isValid) {
      await onApprove(result.profile);
      setIsSaved(true);
    }
    setIsSaving(false);
  }

  const availableProblemIds = draft.productKnowledge.customerProblems.map((problem) => problem.id);
  const availableOutcomeIds = draft.productKnowledge.desiredOutcomes.map((outcome) => outcome.id);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-950">Refine Vendor Profile</h1>
        <p className="text-sm text-zinc-500">
          Review what GTM Brain drafted from your sources. Edit any description, remove rows the AI
          got wrong, or add your own before approving.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-950">Offering</h2>
        <TextAreaField
          label="What does this vendor sell?"
          value={draft.productKnowledge.offering}
          onChange={updateOffering}
          rows={3}
        />
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Customer Problems"
          description="What problems does this vendor's offering address?"
          addLabel="problem"
          onAdd={() =>
            updateProductKnowledgeList("customerProblems", (items) => [
              ...items,
              createBlankCustomerProblem(),
            ])
          }
        />
        <div className="space-y-3">
          {draft.productKnowledge.customerProblems.map((problem: CustomerProblem) => (
            <RowCard
              key={problem.id}
              removeLabel="problem"
              onRemove={() =>
                updateProductKnowledgeList("customerProblems", (items) =>
                  items.filter((item) => item.id !== problem.id),
                )
              }
            >
              <TextField
                label="Statement"
                value={problem.statement}
                onChange={(value) =>
                  updateProductKnowledgeList("customerProblems", (items) =>
                    items.map((item) => (item.id === problem.id ? { ...item, statement: value } : item)),
                  )
                }
              />
              <TextField
                label="Impact"
                value={problem.impact}
                onChange={(value) =>
                  updateProductKnowledgeList("customerProblems", (items) =>
                    items.map((item) => (item.id === problem.id ? { ...item, impact: value } : item)),
                  )
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.customerProblems.length === 0 && (
            <p className="text-xs text-zinc-400">No customer problems yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Desired Outcomes"
          description="What outcomes do customers want? Reference problem ids above, comma-separated."
          addLabel="outcome"
          onAdd={() =>
            updateProductKnowledgeList("desiredOutcomes", (items) => [
              ...items,
              createBlankDesiredOutcome(),
            ])
          }
        />
        <div className="space-y-3">
          {draft.productKnowledge.desiredOutcomes.map((outcome: DesiredOutcome) => (
            <RowCard
              key={outcome.id}
              removeLabel="outcome"
              onRemove={() =>
                updateProductKnowledgeList("desiredOutcomes", (items) =>
                  items.filter((item) => item.id !== outcome.id),
                )
              }
            >
              <TextField
                label="Statement"
                value={outcome.statement}
                onChange={(value) =>
                  updateProductKnowledgeList("desiredOutcomes", (items) =>
                    items.map((item) => (item.id === outcome.id ? { ...item, statement: value } : item)),
                  )
                }
              />
              <TextField
                label={`Problem ids (available: ${availableProblemIds.join(", ") || "none yet"})`}
                value={formatIdList(outcome.problemIds)}
                onChange={(value) =>
                  updateProductKnowledgeList("desiredOutcomes", (items) =>
                    items.map((item) =>
                      item.id === outcome.id ? { ...item, problemIds: parseIdList(value) } : item,
                    ),
                  )
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.desiredOutcomes.length === 0 && (
            <p className="text-xs text-zinc-400">No desired outcomes yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Capabilities"
          description="What can the product do? Reference problem/outcome ids above, comma-separated."
          addLabel="capability"
          onAdd={() =>
            updateProductKnowledgeList("capabilities", (items) => [...items, createBlankCapability()])
          }
        />
        <div className="space-y-3">
          {draft.productKnowledge.capabilities.map((capability: Capability) => (
            <RowCard
              key={capability.id}
              removeLabel="capability"
              onRemove={() =>
                updateProductKnowledgeList("capabilities", (items) =>
                  items.filter((item) => item.id !== capability.id),
                )
              }
            >
              <TextField
                label="Name"
                value={capability.name}
                onChange={(value) =>
                  updateProductKnowledgeList("capabilities", (items) =>
                    items.map((item) => (item.id === capability.id ? { ...item, name: value } : item)),
                  )
                }
              />
              <TextField
                label="Description"
                value={capability.description}
                onChange={(value) =>
                  updateProductKnowledgeList("capabilities", (items) =>
                    items.map((item) =>
                      item.id === capability.id ? { ...item, description: value } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`Problem ids (available: ${availableProblemIds.join(", ") || "none yet"})`}
                value={formatIdList(capability.problemIds)}
                onChange={(value) =>
                  updateProductKnowledgeList("capabilities", (items) =>
                    items.map((item) =>
                      item.id === capability.id ? { ...item, problemIds: parseIdList(value) } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`Outcome ids (available: ${availableOutcomeIds.join(", ") || "none yet"})`}
                value={formatIdList(capability.outcomeIds)}
                onChange={(value) =>
                  updateProductKnowledgeList("capabilities", (items) =>
                    items.map((item) =>
                      item.id === capability.id ? { ...item, outcomeIds: parseIdList(value) } : item,
                    ),
                  )
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.capabilities.length === 0 && (
            <p className="text-xs text-zinc-400">No capabilities yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Why Now Signals"
          description="What timing signals suggest a customer should act now?"
          addLabel="signal"
          onAdd={() =>
            updateDecisionStrategyList("whyNowSignals", (items) => [
              ...items,
              createBlankWhyNowSignal(),
            ])
          }
        />
        <div className="space-y-3">
          {draft.decisionStrategy.whyNowSignals.map((signal: WhyNowSignal) => (
            <RowCard
              key={signal.id}
              removeLabel="signal"
              onRemove={() =>
                updateDecisionStrategyList("whyNowSignals", (items) =>
                  items.filter((item) => item.id !== signal.id),
                )
              }
            >
              <TextField
                label="Signal"
                value={signal.signal}
                onChange={(value) =>
                  updateDecisionStrategyList("whyNowSignals", (items) =>
                    items.map((item) => (item.id === signal.id ? { ...item, signal: value } : item)),
                  )
                }
              />
              <TextField
                label="Why it matters"
                value={signal.whyItMatters}
                onChange={(value) =>
                  updateDecisionStrategyList("whyNowSignals", (items) =>
                    items.map((item) =>
                      item.id === signal.id ? { ...item, whyItMatters: value } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`Problem ids (available: ${availableProblemIds.join(", ") || "none yet"})`}
                value={formatIdList(signal.problemIds)}
                onChange={(value) =>
                  updateDecisionStrategyList("whyNowSignals", (items) =>
                    items.map((item) =>
                      item.id === signal.id ? { ...item, problemIds: parseIdList(value) } : item,
                    ),
                  )
                }
              />
              <TextField
                label={`Outcome ids (available: ${availableOutcomeIds.join(", ") || "none yet"})`}
                value={formatIdList(signal.outcomeIds)}
                onChange={(value) =>
                  updateDecisionStrategyList("whyNowSignals", (items) =>
                    items.map((item) =>
                      item.id === signal.id ? { ...item, outcomeIds: parseIdList(value) } : item,
                    ),
                  )
                }
              />
              <TextField
                label="First meeting angle"
                value={signal.firstMeetingAngle}
                onChange={(value) =>
                  updateDecisionStrategyList("whyNowSignals", (items) =>
                    items.map((item) =>
                      item.id === signal.id ? { ...item, firstMeetingAngle: value } : item,
                    ),
                  )
                }
              />
            </RowCard>
          ))}
          {draft.decisionStrategy.whyNowSignals.length === 0 && (
            <p className="text-xs text-zinc-400">No Why Now signals yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Red Flags"
          description="What conditions should disqualify or caution against pursuing an account?"
          addLabel="red flag"
          onAdd={() =>
            updateDecisionStrategyList("redFlags", (items) => [...items, createBlankRedFlag()])
          }
        />
        <div className="space-y-3">
          {draft.decisionStrategy.redFlags.map((redFlag: RedFlag) => (
            <RowCard
              key={redFlag.id}
              removeLabel="red flag"
              onRemove={() =>
                updateDecisionStrategyList("redFlags", (items) =>
                  items.filter((item) => item.id !== redFlag.id),
                )
              }
            >
              <TextField
                label="Condition"
                value={redFlag.condition}
                onChange={(value) =>
                  updateDecisionStrategyList("redFlags", (items) =>
                    items.map((item) => (item.id === redFlag.id ? { ...item, condition: value } : item)),
                  )
                }
              />
              <TextField
                label="Why it matters"
                value={redFlag.whyItMatters}
                onChange={(value) =>
                  updateDecisionStrategyList("redFlags", (items) =>
                    items.map((item) =>
                      item.id === redFlag.id ? { ...item, whyItMatters: value } : item,
                    ),
                  )
                }
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Severity</span>
                <select
                  value={redFlag.severity}
                  onChange={(event) =>
                    updateDecisionStrategyList("redFlags", (items) =>
                      items.map((item) =>
                        item.id === redFlag.id
                          ? { ...item, severity: event.target.value as RedFlagSeverity }
                          : item,
                      ),
                    )
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="cautionary">Cautionary</option>
                  <option value="disqualifying">Disqualifying</option>
                </select>
              </label>
              <fieldset className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Affected decision groups</span>
                <div className="flex gap-4">
                  {(["whyThem", "whyUs"] as RedFlagDecisionGroup[]).map((group) => (
                    <label key={group} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={redFlag.affectedDecisionGroups.includes(group)}
                        onChange={(event) =>
                          updateDecisionStrategyList("redFlags", (items) =>
                            items.map((item) => {
                              if (item.id !== redFlag.id) {
                                return item;
                              }
                              const nextGroups = event.target.checked
                                ? [...item.affectedDecisionGroups, group]
                                : item.affectedDecisionGroups.filter((existing) => existing !== group);
                              return { ...item, affectedDecisionGroups: nextGroups };
                            }),
                          )
                        }
                      />
                      {group === "whyThem" ? "Why Them" : "Why Us"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </RowCard>
          ))}
          {draft.decisionStrategy.redFlags.length === 0 && (
            <p className="text-xs text-zinc-400">No red flags yet.</p>
          )}
        </div>
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Fix these before approving:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {isSaved && errors.length === 0 && (
        <p className="text-sm font-medium text-green-700">Saved.</p>
      )}

      <div className="flex justify-end border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isSaving}
          className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSaving ? "Validating..." : "Approve & Save"}
        </button>
      </div>
    </section>
  );
}
