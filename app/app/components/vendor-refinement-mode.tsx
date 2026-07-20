"use client";

/**
 * Checkpoint B: Vendor Profile Refinement Mode.
 *
 * Lets the vendor review, correct, remove, and voluntarily enrich every V1
 * decision-driving collection on the canonical VendorProfile before approval.
 * Persistence is intentionally left to the parent `onApprove` callback.
 */
import { useState } from "react";
import type {
  BuyingReason,
  Capability,
  CommonAlternative,
  CustomerProblem,
  DesiredOutcome,
  FirmographicDisqualifier,
  IdealCustomerCriterion,
  IdealCustomerExample,
  IdealCustomerRelationship,
  ProofPoint,
  RedFlag,
  RedFlagDecisionGroup,
  RedFlagSeverity,
  RelevantDifferentiation,
  UseCase,
  VendorProfile,
  WhyNowSignal,
} from "../lib/intelligence/vendorProfile";
import {
  buildRefinementDraft,
  buildValuePropositionPreview,
  createBlankBuyingReason,
  createBlankCapability,
  createBlankCommonAlternative,
  createBlankCustomerProblem,
  createBlankDesiredOutcome,
  createBlankFirmographicDisqualifier,
  createBlankIcpCriterion,
  createBlankIcpExample,
  createBlankProofPoint,
  createBlankRedFlag,
  createBlankRelevantDifferentiation,
  createBlankUseCase,
  createBlankWhyNowSignal,
  labelForAlternative,
  labelForCapability,
  labelForCriterion,
  labelForOutcome,
  labelForProblem,
  labelForUseCase,
  removeBuyingReason,
  removeCapability,
  removeCommonAlternative,
  removeCustomerProblem,
  removeDesiredOutcome,
  removeFirmographicDisqualifier,
  removeIcpCriterion,
  removeIcpExample,
  removeProofPoint,
  removeRedFlag,
  removeRelevantDifferentiation,
  removeUseCase,
  removeWhyNowSignal,
  toggleReferenceId,
  validateRefinementDraft,
  type VendorIdentityDraft,
} from "../lib/intelligence/vendorRefinementDraft";

export interface VendorRefinementModeProps {
  /** Draft from research (partial or full canonical VendorProfile). */
  initialProfile: Partial<VendorProfile>;
  /** Optional identity overlay when not already present on initialProfile. */
  vendorIdentity?: Partial<VendorIdentityDraft>;
  /** Called only after validation succeeds. Checkpoint B does not persist. */
  onApprove: (profile: VendorProfile) => void | Promise<void>;
}

const EMPTY_COLLECTION_MESSAGE =
  "No evidence was found during research. Add information if you know it.";

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
        <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
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

function EmptyCollectionNotice() {
  return <p className="text-xs text-zinc-400">{EMPTY_COLLECTION_MESSAGE}</p>;
}

function FrameworkSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5">
      <header className="space-y-1 border-b border-zinc-200 pb-3">
        <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

function ReferencePicker({
  label,
  options,
  selectedIds,
  onChange,
  emptyHint,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  emptyHint: string;
}) {
  if (options.length === 0) {
    return (
      <div className="sm:col-span-2 text-sm">
        <span className="mb-1 block font-medium text-zinc-700">{label}</span>
        <p className="text-xs text-zinc-400">{emptyHint}</p>
      </div>
    );
  }

  return (
    <fieldset className="sm:col-span-2 text-sm">
      <legend className="mb-1 block font-medium text-zinc-700">{label}</legend>
      <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
        {options.map((option) => (
          <label key={option.id} className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selectedIds.includes(option.id)}
              onChange={(event) =>
                onChange(toggleReferenceId(selectedIds, option.id, event.target.checked))
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-zinc-700">
        {items.slice(0, 4).map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
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

  function markDirty(next: VendorProfile) {
    setIsSaved(false);
    setDraft(next);
  }

  async function handleApprove() {
    setIsSaving(true);
    setIsSaved(false);
    const result = validateRefinementDraft(draft);
    setErrors(result.userFacingErrors);

    if (result.isValid) {
      await onApprove(result.profile);
      setIsSaved(true);
    }
    setIsSaving(false);
  }

  const problemOptions = draft.productKnowledge.customerProblems.map((item) => ({
    id: item.id,
    label: labelForProblem(item),
  }));
  const outcomeOptions = draft.productKnowledge.desiredOutcomes.map((item) => ({
    id: item.id,
    label: labelForOutcome(item),
  }));
  const capabilityOptions = draft.productKnowledge.capabilities.map((item) => ({
    id: item.id,
    label: labelForCapability(item),
  }));
  const useCaseOptions = draft.productKnowledge.useCases.map((item) => ({
    id: item.id,
    label: labelForUseCase(item),
  }));
  const alternativeOptions = draft.productKnowledge.commonAlternatives.map((item) => ({
    id: item.id,
    label: labelForAlternative(item),
  }));
  const criterionOptions = draft.decisionStrategy.idealCustomerProfile.criteria.map((item) => ({
    id: item.id,
    label: labelForCriterion(item),
  }));

  const preview = buildValuePropositionPreview(draft);
  const previewHasContent =
    preview.intendedCustomer.length > 0 ||
    preview.topProblems.length > 0 ||
    preview.outcomes.length > 0 ||
    preview.buyingReasons.length > 0 ||
    preview.capabilitiesAndUseCases.length > 0 ||
    preview.differentiationAndProof.length > 0;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-950">Refine Vendor Profile</h1>
        <p className="text-sm text-zinc-500">
          Review the AI draft from your website. Correct anything inaccurate, remove what does not
          apply, and add what you know before approving. Empty sections may stay empty.
        </p>
      </header>

      {/* 1. Offering & Value Proposition */}
      <FrameworkSection
        title="1. Offering & Value Proposition"
        description="What you sell, who it is for, and how value is delivered — summarized from structured fields below."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Vendor name"
            value={draft.vendorName}
            onChange={(value) => markDirty({ ...draft, vendorName: value })}
          />
          <TextField
            label="Website URL"
            value={draft.websiteUrl}
            onChange={(value) => markDirty({ ...draft, websiteUrl: value })}
          />
        </div>
        <TextAreaField
          label="Offering (short product description)"
          value={draft.productKnowledge.offering}
          onChange={(value) =>
            markDirty({
              ...draft,
              productKnowledge: { ...draft.productKnowledge, offering: value },
            })
          }
          rows={3}
        />
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Value Proposition preview</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Read-only summary from ICP, problems, outcomes, buying reasons, capabilities, use cases,
            differentiation, and proof. Not saved as a separate field.
          </p>
          {previewHasContent ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PreviewList title="Intended customer" items={preview.intendedCustomer} />
              <PreviewList title="Problems solved" items={preview.topProblems} />
              <PreviewList title="Outcomes" items={preview.outcomes} />
              <PreviewList title="Why customers buy" items={preview.buyingReasons} />
              <PreviewList title="Capabilities & use cases" items={preview.capabilitiesAndUseCases} />
              <PreviewList title="Differentiation & proof" items={preview.differentiationAndProof} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-400">
              Add structured details in the sections below to populate this preview.
            </p>
          )}
        </div>
      </FrameworkSection>

      {/* 2. Why Them */}
      <FrameworkSection
        title="2. Why Them"
        description="Fit signals: problems, outcomes, buying reasons, and ideal customer profile."
      >
        <div className="space-y-3">
          <SectionHeader
            title="Customer Problems"
            description="Important customer problems your offering addresses."
            addLabel="problem"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  customerProblems: [
                    ...draft.productKnowledge.customerProblems,
                    createBlankCustomerProblem(),
                  ],
                },
              })
            }
          />
          {draft.productKnowledge.customerProblems.map((problem: CustomerProblem) => (
            <RowCard
              key={problem.id}
              removeLabel="problem"
              onRemove={() => markDirty(removeCustomerProblem(draft, problem.id))}
            >
              <TextField
                label="Statement"
                value={problem.statement}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      customerProblems: draft.productKnowledge.customerProblems.map((item) =>
                        item.id === problem.id ? { ...item, statement: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Impact"
                value={problem.impact}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      customerProblems: draft.productKnowledge.customerProblems.map((item) =>
                        item.id === problem.id ? { ...item, impact: value } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.customerProblems.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Desired Outcomes"
            description="Business outcomes customers want."
            addLabel="outcome"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  desiredOutcomes: [
                    ...draft.productKnowledge.desiredOutcomes,
                    createBlankDesiredOutcome(),
                  ],
                },
              })
            }
          />
          {draft.productKnowledge.desiredOutcomes.map((outcome: DesiredOutcome) => (
            <RowCard
              key={outcome.id}
              removeLabel="outcome"
              onRemove={() => markDirty(removeDesiredOutcome(draft, outcome.id))}
            >
              <TextField
                label="Statement"
                value={outcome.statement}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      desiredOutcomes: draft.productKnowledge.desiredOutcomes.map((item) =>
                        item.id === outcome.id ? { ...item, statement: value } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related problems"
                options={problemOptions}
                selectedIds={outcome.problemIds}
                emptyHint="Add customer problems first to link them here."
                onChange={(problemIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      desiredOutcomes: draft.productKnowledge.desiredOutcomes.map((item) =>
                        item.id === outcome.id ? { ...item, problemIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.desiredOutcomes.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Buying Reasons"
            description="Why customers buy."
            addLabel="buying reason"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  buyingReasons: [...draft.productKnowledge.buyingReasons, createBlankBuyingReason()],
                },
              })
            }
          />
          {draft.productKnowledge.buyingReasons.map((reason: BuyingReason) => (
            <RowCard
              key={reason.id}
              removeLabel="buying reason"
              onRemove={() => markDirty(removeBuyingReason(draft, reason.id))}
            >
              <TextField
                label="Statement"
                value={reason.statement}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      buyingReasons: draft.productKnowledge.buyingReasons.map((item) =>
                        item.id === reason.id ? { ...item, statement: value } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related outcomes"
                options={outcomeOptions}
                selectedIds={reason.outcomeIds}
                emptyHint="Add desired outcomes first to link them here."
                onChange={(outcomeIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      buyingReasons: draft.productKnowledge.buyingReasons.map((item) =>
                        item.id === reason.id ? { ...item, outcomeIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.buyingReasons.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="ICP Criteria"
            description="Who the product is for."
            addLabel="criterion"
            onAdd={() =>
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    criteria: [
                      ...draft.decisionStrategy.idealCustomerProfile.criteria,
                      createBlankIcpCriterion(),
                    ],
                  },
                },
              })
            }
          />
          {draft.decisionStrategy.idealCustomerProfile.criteria.map(
            (criterion: IdealCustomerCriterion) => (
              <RowCard
                key={criterion.id}
                removeLabel="criterion"
                onRemove={() => markDirty(removeIcpCriterion(draft, criterion.id))}
              >
                <TextAreaField
                  label="Description"
                  value={criterion.description}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          criteria: draft.decisionStrategy.idealCustomerProfile.criteria.map(
                            (item) =>
                              item.id === criterion.id ? { ...item, description: value } : item,
                          ),
                        },
                      },
                    })
                  }
                />
              </RowCard>
            ),
          )}
          {draft.decisionStrategy.idealCustomerProfile.criteria.length === 0 && (
            <EmptyCollectionNotice />
          )}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="ICP Examples"
            description="Named example companies when known."
            addLabel="example"
            onAdd={() =>
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    examples: [
                      ...draft.decisionStrategy.idealCustomerProfile.examples,
                      createBlankIcpExample(),
                    ],
                  },
                },
              })
            }
          />
          {draft.decisionStrategy.idealCustomerProfile.examples.map(
            (example: IdealCustomerExample) => (
              <RowCard
                key={example.id}
                removeLabel="example"
                onRemove={() => markDirty(removeIcpExample(draft, example.id))}
              >
                <TextField
                  label="Company name"
                  value={example.companyName}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          examples: draft.decisionStrategy.idealCustomerProfile.examples.map(
                            (item) =>
                              item.id === example.id ? { ...item, companyName: value } : item,
                          ),
                        },
                      },
                    })
                  }
                />
                <TextField
                  label="Rationale"
                  value={example.rationale}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          examples: draft.decisionStrategy.idealCustomerProfile.examples.map(
                            (item) =>
                              item.id === example.id ? { ...item, rationale: value } : item,
                          ),
                        },
                      },
                    })
                  }
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-zinc-700">Relationship</span>
                  <select
                    value={example.relationship ?? "example-only"}
                    onChange={(event) =>
                      markDirty({
                        ...draft,
                        decisionStrategy: {
                          ...draft.decisionStrategy,
                          idealCustomerProfile: {
                            ...draft.decisionStrategy.idealCustomerProfile,
                            examples: draft.decisionStrategy.idealCustomerProfile.examples.map(
                              (item) =>
                                item.id === example.id
                                  ? {
                                      ...item,
                                      relationship: event.target
                                        .value as IdealCustomerRelationship,
                                    }
                                  : item,
                            ),
                          },
                        },
                      })
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  >
                    <option value="customer">Customer</option>
                    <option value="prospect">Prospect</option>
                    <option value="example-only">Example only</option>
                  </select>
                </label>
                <ReferencePicker
                  label="Related ICP criteria"
                  options={criterionOptions}
                  selectedIds={example.criterionIds}
                  emptyHint="Add ICP criteria first to link them here."
                  onChange={(criterionIds) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          examples: draft.decisionStrategy.idealCustomerProfile.examples.map(
                            (item) =>
                              item.id === example.id ? { ...item, criterionIds } : item,
                          ),
                        },
                      },
                    })
                  }
                />
              </RowCard>
            ),
          )}
          {draft.decisionStrategy.idealCustomerProfile.examples.length === 0 && (
            <EmptyCollectionNotice />
          )}
        </div>
      </FrameworkSection>

      {/* 3. Why Now */}
      <FrameworkSection
        title="3. Why Now"
        description="Timing signals that suggest a prospect should act now."
      >
        <div className="space-y-3">
          <SectionHeader
            title="Why Now Signals"
            description="Timing and urgency signals grounded in your GTM motion."
            addLabel="signal"
            onAdd={() =>
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  whyNowSignals: [
                    ...draft.decisionStrategy.whyNowSignals,
                    createBlankWhyNowSignal(),
                  ],
                },
              })
            }
          />
          {draft.decisionStrategy.whyNowSignals.map((signal: WhyNowSignal) => (
            <RowCard
              key={signal.id}
              removeLabel="signal"
              onRemove={() => markDirty(removeWhyNowSignal(draft, signal.id))}
            >
              <TextField
                label="Signal"
                value={signal.signal}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      whyNowSignals: draft.decisionStrategy.whyNowSignals.map((item) =>
                        item.id === signal.id ? { ...item, signal: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Why it matters"
                value={signal.whyItMatters}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      whyNowSignals: draft.decisionStrategy.whyNowSignals.map((item) =>
                        item.id === signal.id ? { ...item, whyItMatters: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="First meeting angle"
                value={signal.firstMeetingAngle}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      whyNowSignals: draft.decisionStrategy.whyNowSignals.map((item) =>
                        item.id === signal.id ? { ...item, firstMeetingAngle: value } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related problems"
                options={problemOptions}
                selectedIds={signal.problemIds}
                emptyHint="Add customer problems first to link them here."
                onChange={(problemIds) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      whyNowSignals: draft.decisionStrategy.whyNowSignals.map((item) =>
                        item.id === signal.id ? { ...item, problemIds } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related outcomes"
                options={outcomeOptions}
                selectedIds={signal.outcomeIds}
                emptyHint="Add desired outcomes first to link them here."
                onChange={(outcomeIds) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      whyNowSignals: draft.decisionStrategy.whyNowSignals.map((item) =>
                        item.id === signal.id ? { ...item, outcomeIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.decisionStrategy.whyNowSignals.length === 0 && <EmptyCollectionNotice />}
        </div>
      </FrameworkSection>

      {/* 4. Why Us */}
      <FrameworkSection
        title="4. Why Us"
        description="Capabilities, use cases, alternatives, differentiation, and proof."
      >
        <div className="space-y-3">
          <SectionHeader
            title="Capabilities"
            description="What the product can do."
            addLabel="capability"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  capabilities: [...draft.productKnowledge.capabilities, createBlankCapability()],
                },
              })
            }
          />
          {draft.productKnowledge.capabilities.map((capability: Capability) => (
            <RowCard
              key={capability.id}
              removeLabel="capability"
              onRemove={() => markDirty(removeCapability(draft, capability.id))}
            >
              <TextField
                label="Name"
                value={capability.name}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      capabilities: draft.productKnowledge.capabilities.map((item) =>
                        item.id === capability.id ? { ...item, name: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Description"
                value={capability.description}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      capabilities: draft.productKnowledge.capabilities.map((item) =>
                        item.id === capability.id ? { ...item, description: value } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related problems"
                options={problemOptions}
                selectedIds={capability.problemIds}
                emptyHint="Add customer problems first to link them here."
                onChange={(problemIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      capabilities: draft.productKnowledge.capabilities.map((item) =>
                        item.id === capability.id ? { ...item, problemIds } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related outcomes"
                options={outcomeOptions}
                selectedIds={capability.outcomeIds}
                emptyHint="Add desired outcomes first to link them here."
                onChange={(outcomeIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      capabilities: draft.productKnowledge.capabilities.map((item) =>
                        item.id === capability.id ? { ...item, outcomeIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.capabilities.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Use Cases"
            description="Concrete ways customers apply the product."
            addLabel="use case"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  useCases: [...draft.productKnowledge.useCases, createBlankUseCase()],
                },
              })
            }
          />
          {draft.productKnowledge.useCases.map((useCase: UseCase) => (
            <RowCard
              key={useCase.id}
              removeLabel="use case"
              onRemove={() => markDirty(removeUseCase(draft, useCase.id))}
            >
              <TextField
                label="Name"
                value={useCase.name}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      useCases: draft.productKnowledge.useCases.map((item) =>
                        item.id === useCase.id ? { ...item, name: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Description"
                value={useCase.description}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      useCases: draft.productKnowledge.useCases.map((item) =>
                        item.id === useCase.id ? { ...item, description: value } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related problems"
                options={problemOptions}
                selectedIds={useCase.problemIds}
                emptyHint="Add customer problems first to link them here."
                onChange={(problemIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      useCases: draft.productKnowledge.useCases.map((item) =>
                        item.id === useCase.id ? { ...item, problemIds } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related outcomes"
                options={outcomeOptions}
                selectedIds={useCase.outcomeIds}
                emptyHint="Add desired outcomes first to link them here."
                onChange={(outcomeIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      useCases: draft.productKnowledge.useCases.map((item) =>
                        item.id === useCase.id ? { ...item, outcomeIds } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related capabilities"
                options={capabilityOptions}
                selectedIds={useCase.capabilityIds}
                emptyHint="Add capabilities first to link them here."
                onChange={(capabilityIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      useCases: draft.productKnowledge.useCases.map((item) =>
                        item.id === useCase.id ? { ...item, capabilityIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.useCases.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Common Alternatives"
            description="Alternatives buyers compare against."
            addLabel="alternative"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  commonAlternatives: [
                    ...draft.productKnowledge.commonAlternatives,
                    createBlankCommonAlternative(),
                  ],
                },
              })
            }
          />
          {draft.productKnowledge.commonAlternatives.map((alternative: CommonAlternative) => (
            <RowCard
              key={alternative.id}
              removeLabel="alternative"
              onRemove={() => markDirty(removeCommonAlternative(draft, alternative.id))}
            >
              <TextField
                label="Name"
                value={alternative.name}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      commonAlternatives: draft.productKnowledge.commonAlternatives.map((item) =>
                        item.id === alternative.id ? { ...item, name: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Description"
                value={alternative.description}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      commonAlternatives: draft.productKnowledge.commonAlternatives.map((item) =>
                        item.id === alternative.id ? { ...item, description: value } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.commonAlternatives.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Relevant Differentiation"
            description="How you differ from those alternatives."
            addLabel="differentiation"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  relevantDifferentiation: [
                    ...draft.productKnowledge.relevantDifferentiation,
                    createBlankRelevantDifferentiation(),
                  ],
                },
              })
            }
          />
          {draft.productKnowledge.relevantDifferentiation.map(
            (differentiation: RelevantDifferentiation) => (
              <RowCard
                key={differentiation.id}
                removeLabel="differentiation"
                onRemove={() => markDirty(removeRelevantDifferentiation(draft, differentiation.id))}
              >
                <TextAreaField
                  label="Statement"
                  value={differentiation.statement}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      productKnowledge: {
                        ...draft.productKnowledge,
                        relevantDifferentiation: draft.productKnowledge.relevantDifferentiation.map(
                          (item) =>
                            item.id === differentiation.id ? { ...item, statement: value } : item,
                        ),
                      },
                    })
                  }
                />
                <ReferencePicker
                  label="Related alternatives"
                  options={alternativeOptions}
                  selectedIds={differentiation.alternativeIds}
                  emptyHint="Add common alternatives first to link them here."
                  onChange={(alternativeIds) =>
                    markDirty({
                      ...draft,
                      productKnowledge: {
                        ...draft.productKnowledge,
                        relevantDifferentiation: draft.productKnowledge.relevantDifferentiation.map(
                          (item) =>
                            item.id === differentiation.id ? { ...item, alternativeIds } : item,
                        ),
                      },
                    })
                  }
                />
                <ReferencePicker
                  label="Related problems"
                  options={problemOptions}
                  selectedIds={differentiation.problemIds}
                  emptyHint="Add customer problems first to link them here."
                  onChange={(problemIds) =>
                    markDirty({
                      ...draft,
                      productKnowledge: {
                        ...draft.productKnowledge,
                        relevantDifferentiation: draft.productKnowledge.relevantDifferentiation.map(
                          (item) =>
                            item.id === differentiation.id ? { ...item, problemIds } : item,
                        ),
                      },
                    })
                  }
                />
                <ReferencePicker
                  label="Related outcomes"
                  options={outcomeOptions}
                  selectedIds={differentiation.outcomeIds}
                  emptyHint="Add desired outcomes first to link them here."
                  onChange={(outcomeIds) =>
                    markDirty({
                      ...draft,
                      productKnowledge: {
                        ...draft.productKnowledge,
                        relevantDifferentiation: draft.productKnowledge.relevantDifferentiation.map(
                          (item) =>
                            item.id === differentiation.id ? { ...item, outcomeIds } : item,
                        ),
                      },
                    })
                  }
                />
              </RowCard>
            ),
          )}
          {draft.productKnowledge.relevantDifferentiation.length === 0 && <EmptyCollectionNotice />}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Proof Points"
            description="Evidence that substantiates your claims."
            addLabel="proof point"
            onAdd={() =>
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  proofPoints: [...draft.productKnowledge.proofPoints, createBlankProofPoint()],
                },
              })
            }
          />
          {draft.productKnowledge.proofPoints.map((proofPoint: ProofPoint) => (
            <RowCard
              key={proofPoint.id}
              removeLabel="proof point"
              onRemove={() => markDirty(removeProofPoint(draft, proofPoint.id))}
            >
              <TextAreaField
                label="Summary"
                value={proofPoint.summary}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id ? { ...item, summary: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Customer name (optional)"
                value={proofPoint.customerName ?? ""}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id
                          ? { ...item, customerName: value || undefined }
                          : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Industry (optional)"
                value={proofPoint.industry ?? ""}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id
                          ? { ...item, industry: value || undefined }
                          : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Metric (optional)"
                value={proofPoint.metric ?? ""}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id ? { ...item, metric: value || undefined } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related outcomes"
                options={outcomeOptions}
                selectedIds={proofPoint.outcomeIds}
                emptyHint="Add desired outcomes first to link them here."
                onChange={(outcomeIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id ? { ...item, outcomeIds } : item,
                      ),
                    },
                  })
                }
              />
              <ReferencePicker
                label="Related use cases"
                options={useCaseOptions}
                selectedIds={proofPoint.useCaseIds}
                emptyHint="Add use cases first to link them here."
                onChange={(useCaseIds) =>
                  markDirty({
                    ...draft,
                    productKnowledge: {
                      ...draft.productKnowledge,
                      proofPoints: draft.productKnowledge.proofPoints.map((item) =>
                        item.id === proofPoint.id ? { ...item, useCaseIds } : item,
                      ),
                    },
                  })
                }
              />
            </RowCard>
          ))}
          {draft.productKnowledge.proofPoints.length === 0 && <EmptyCollectionNotice />}
        </div>
      </FrameworkSection>

      {/* 5. Disqualifiers & Red Flags */}
      <FrameworkSection
        title="5. Disqualifiers & Red Flags"
        description="Firmographic disqualifiers and red flags. These never apply to Why Now."
      >
        <div className="space-y-3">
          <SectionHeader
            title="Firmographic Disqualifiers"
            description="Firmographic conditions that make a company a poor fit (Why Them)."
            addLabel="disqualifier"
            onAdd={() =>
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    firmographicDisqualifiers: [
                      ...draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers,
                      createBlankFirmographicDisqualifier(),
                    ],
                  },
                },
              })
            }
          />
          {draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.map(
            (disqualifier: FirmographicDisqualifier) => (
              <RowCard
                key={disqualifier.id}
                removeLabel="disqualifier"
                onRemove={() => markDirty(removeFirmographicDisqualifier(draft, disqualifier.id))}
              >
                <TextField
                  label="Condition"
                  value={disqualifier.condition}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          firmographicDisqualifiers:
                            draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.map(
                              (item) =>
                                item.id === disqualifier.id ? { ...item, condition: value } : item,
                            ),
                        },
                      },
                    })
                  }
                />
                <TextField
                  label="Why it matters"
                  value={disqualifier.whyItMatters}
                  onChange={(value) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        idealCustomerProfile: {
                          ...draft.decisionStrategy.idealCustomerProfile,
                          firmographicDisqualifiers:
                            draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.map(
                              (item) =>
                                item.id === disqualifier.id
                                  ? { ...item, whyItMatters: value }
                                  : item,
                            ),
                        },
                      },
                    })
                  }
                />
              </RowCard>
            ),
          )}
          {draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.length === 0 && (
            <EmptyCollectionNotice />
          )}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Red Flags"
            description="Conditions that caution against or disqualify pursuing an account (Why Them and/or Why Us)."
            addLabel="red flag"
            onAdd={() =>
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  redFlags: [...draft.decisionStrategy.redFlags, createBlankRedFlag()],
                },
              })
            }
          />
          {draft.decisionStrategy.redFlags.map((redFlag: RedFlag) => (
            <RowCard
              key={redFlag.id}
              removeLabel="red flag"
              onRemove={() => markDirty(removeRedFlag(draft, redFlag.id))}
            >
              <TextField
                label="Condition"
                value={redFlag.condition}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      redFlags: draft.decisionStrategy.redFlags.map((item) =>
                        item.id === redFlag.id ? { ...item, condition: value } : item,
                      ),
                    },
                  })
                }
              />
              <TextField
                label="Why it matters"
                value={redFlag.whyItMatters}
                onChange={(value) =>
                  markDirty({
                    ...draft,
                    decisionStrategy: {
                      ...draft.decisionStrategy,
                      redFlags: draft.decisionStrategy.redFlags.map((item) =>
                        item.id === redFlag.id ? { ...item, whyItMatters: value } : item,
                      ),
                    },
                  })
                }
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Severity</span>
                <select
                  value={redFlag.severity}
                  onChange={(event) =>
                    markDirty({
                      ...draft,
                      decisionStrategy: {
                        ...draft.decisionStrategy,
                        redFlags: draft.decisionStrategy.redFlags.map((item) =>
                          item.id === redFlag.id
                            ? { ...item, severity: event.target.value as RedFlagSeverity }
                            : item,
                        ),
                      },
                    })
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
                          markDirty({
                            ...draft,
                            decisionStrategy: {
                              ...draft.decisionStrategy,
                              redFlags: draft.decisionStrategy.redFlags.map((item) => {
                                if (item.id !== redFlag.id) {
                                  return item;
                                }
                                const nextGroups = event.target.checked
                                  ? [...item.affectedDecisionGroups, group]
                                  : item.affectedDecisionGroups.filter(
                                      (existing) => existing !== group,
                                    );
                                return { ...item, affectedDecisionGroups: nextGroups };
                              }),
                            },
                          })
                        }
                      />
                      {group === "whyThem" ? "Why Them" : "Why Us"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </RowCard>
          ))}
          {draft.decisionStrategy.redFlags.length === 0 && <EmptyCollectionNotice />}
        </div>
      </FrameworkSection>

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
        <p className="text-sm font-medium text-green-700">Approved (ready for the parent to save).</p>
      )}

      <div className="flex justify-end border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isSaving}
          className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSaving ? "Validating..." : "Approve"}
        </button>
      </div>
    </section>
  );
}
