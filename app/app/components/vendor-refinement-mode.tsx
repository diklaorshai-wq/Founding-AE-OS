"use client";

/**
 * Vendor Profile Refinement Mode — compact accordion + master/detail editing.
 * Preserves full canonical VendorProfile editing without changing validation or IDs.
 */
import { useMemo, useState } from "react";
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
  buildRefinementSectionSummaries,
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
  findFirstSectionWithValidationErrors,
  labelForAlternative,
  labelForBuyingReason,
  labelForCapability,
  labelForCriterion,
  labelForDifferentiation,
  labelForFirmographicDisqualifier,
  labelForIcpExample,
  labelForOutcome,
  labelForProblem,
  labelForProofPoint,
  labelForRedFlag,
  labelForUseCase,
  labelForWhyNowSignal,
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
  toggleOpenSection,
  toggleExpandedItemId,
  type RefinementSectionId,
  type VendorIdentityDraft,
} from "../lib/intelligence/vendorRefinementDraft";

export interface VendorRefinementModeProps {
  initialProfile: Partial<VendorProfile>;
  vendorIdentity?: Partial<VendorIdentityDraft>;
  onApprove: (profile: VendorProfile) => void | Promise<void>;
}

const EMPTY_COLLECTION_MESSAGE =
  "No evidence was found during research. Add information if you know it.";

const SECTION_META: Record<
  RefinementSectionId,
  { title: string; description: string }
> = {
  offering: {
    title: "1. Offering & Value Proposition",
    description: "What you sell and how value is framed.",
  },
  whyThem: {
    title: "2. Why Them",
    description: "Problems, outcomes, buying reasons, and ICP.",
  },
  whyNow: {
    title: "3. Why Now",
    description: "Timing signals that suggest action now.",
  },
  whyUs: {
    title: "4. Why Us",
    description: "Capabilities, use cases, alternatives, differentiation, and proof.",
  },
  disqualifiers: {
    title: "5. Disqualifiers & Red Flags",
    description: "Firmographic disqualifiers and red flags (never Why Now).",
  },
};

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
      <span className="mb-0.5 block font-medium text-zinc-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block text-sm sm:col-span-2">
      <span className="mb-0.5 block font-medium text-zinc-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
      />
    </label>
  );
}

function CompactReferencePicker({
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
        <span className="mb-0.5 block font-medium text-zinc-700">{label}</span>
        <p className="text-xs text-zinc-400">{emptyHint}</p>
      </div>
    );
  }

  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options.filter((option) => !selectedIds.includes(option.id));

  return (
    <div className="sm:col-span-2 space-y-2 text-sm">
      <span className="block font-medium text-zinc-700">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {selected.length === 0 && (
          <span className="text-xs text-zinc-400">None selected</span>
        )}
        {selected.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(toggleReferenceId(selectedIds, option.id, false))}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-800"
            title="Remove relationship"
          >
            <span className="truncate">{option.label}</span>
            <span aria-hidden="true" className="text-zinc-500">
              ×
            </span>
          </button>
        ))}
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed border-zinc-200 bg-white p-2">
          {available.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(toggleReferenceId(selectedIds, option.id, true))}
              className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
            >
              + {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionBlock({
  title,
  description,
  addLabel,
  onAdd,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  addLabel: string;
  onAdd: () => void;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-md border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
        >
          + Add {addLabel}
        </button>
      </div>
      {isEmpty ? (
        <p className="text-xs text-zinc-400">{EMPTY_COLLECTION_MESSAGE}</p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">{children}</div>
      )}
    </div>
  );
}

function ItemRow({
  primary,
  secondary,
  expanded,
  onToggle,
  onRemove,
  removeLabel,
  children,
}: {
  primary: string;
  secondary?: string;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        {expanded ? (
          <div className="min-w-0 flex-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Editing
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={false}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-sm font-medium text-zinc-950">{primary}</span>
            {secondary ? (
              <span className="block truncate text-xs text-zinc-500">{secondary}</span>
            ) : null}
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300"
        >
          {expanded ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="shrink-0 px-1.5 text-xs font-medium text-red-600 hover:text-red-700"
          aria-label={`Remove ${removeLabel}`}
        >
          Remove
        </button>
      </div>
      {expanded && (
        <div className="grid gap-2.5 border-t border-zinc-100 bg-zinc-50/70 px-3 py-3 sm:grid-cols-2">
          {children}
        </div>
      )}
    </div>
  );
}

function AccordionSection({
  sectionId,
  open,
  summary,
  onToggle,
  highlighted,
  children,
}: {
  sectionId: RefinementSectionId;
  open: boolean;
  summary: string;
  onToggle: () => void;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  const meta = SECTION_META[sectionId];
  const panelId = `refinement-panel-${sectionId}`;
  const buttonId = `refinement-button-${sectionId}`;

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white ${
        highlighted ? "border-red-300 ring-1 ring-red-200" : "border-zinc-200"
      }`}
    >
      <h2>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-50"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-zinc-950">{meta.title}</span>
            <span className="mt-0.5 block text-xs text-zinc-500">{meta.description}</span>
            <span className="mt-1 block text-xs font-medium text-zinc-600">{summary}</span>
          </span>
          <span className="mt-0.5 shrink-0 text-xs font-medium text-zinc-500" aria-hidden="true">
            {open ? "Collapse" : "Expand"}
          </span>
        </button>
      </h2>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="space-y-5 border-t border-zinc-200 px-4 py-4"
        >
          {children}
        </div>
      )}
    </section>
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
  const [openSection, setOpenSection] = useState<RefinementSectionId | null>("offering");
  const [highlightedSection, setHighlightedSection] = useState<RefinementSectionId | null>(null);
  const [vpExpanded, setVpExpanded] = useState(false);
  const [expandedItemKeys, setExpandedItemKeys] = useState<Record<string, string | null>>({});

  function markDirty(next: VendorProfile) {
    setIsSaved(false);
    setDraft(next);
  }

  function setExpanded(collectionKey: string, id: string | null) {
    setExpandedItemKeys((prev) => ({ ...prev, [collectionKey]: id }));
  }

  function isExpanded(collectionKey: string, id: string): boolean {
    return expandedItemKeys[collectionKey] === id;
  }

  function handleToggleSection(section: RefinementSectionId) {
    setOpenSection((prev) => toggleOpenSection(prev, section));
    if (highlightedSection === section) {
      setHighlightedSection(null);
    }
  }

  function handleToggleItem(collectionKey: string, itemId: string) {
    setExpandedItemKeys((prev) => ({
      ...prev,
      [collectionKey]: toggleExpandedItemId(prev[collectionKey], itemId),
    }));
  }

  async function handleApprove() {
    setIsSaving(true);
    setIsSaved(false);
    const result = validateRefinementDraft(draft);
    setErrors(result.userFacingErrors);

    if (!result.isValid) {
      const section = findFirstSectionWithValidationErrors(result.errors);
      if (section) {
        setOpenSection(section);
        setHighlightedSection(section);
      }
      setIsSaving(false);
      return;
    }

    setHighlightedSection(null);
    await onApprove(result.profile);
    setIsSaved(true);
    setIsSaving(false);
  }

  const summaries = useMemo(() => buildRefinementSectionSummaries(draft), [draft]);
  const preview = useMemo(() => buildValuePropositionPreview(draft), [draft]);
  const previewCount =
    preview.intendedCustomer.length +
    preview.topProblems.length +
    preview.outcomes.length +
    preview.buyingReasons.length +
    preview.capabilitiesAndUseCases.length +
    preview.differentiationAndProof.length;

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

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
      <header className="max-w-3xl space-y-1">
        <h1 className="text-xl font-semibold text-zinc-950">Refine Vendor Profile</h1>
        <p className="text-sm text-zinc-500">
          Expand one section at a time. Edit compact rows as needed. Empty collections may stay
          empty.
        </p>
      </header>

      <div className="space-y-3">
        <AccordionSection
          sectionId="offering"
          open={openSection === "offering"}
          summary={summaries.offering}
          highlighted={highlightedSection === "offering"}
          onToggle={() => handleToggleSection("offering")}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
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
          </div>
          <p className="text-xs text-zinc-500">
            Changes are saved automatically in this draft.
          </p>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50">
            <button
              type="button"
              aria-expanded={vpExpanded}
              onClick={() => setVpExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span>
                <span className="block text-sm font-medium text-zinc-900">
                  Value Proposition preview
                </span>
                <span className="block text-xs text-zinc-500">
                  Read-only summary from structured fields · {previewCount} items
                </span>
              </span>
              <span className="text-xs font-medium text-zinc-500">
                {vpExpanded ? "Hide" : "Show"}
              </span>
            </button>
            {vpExpanded && (
              <div className="grid gap-3 border-t border-zinc-200 px-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["Intended customer", preview.intendedCustomer],
                    ["Problems solved", preview.topProblems],
                    ["Outcomes", preview.outcomes],
                    ["Why customers buy", preview.buyingReasons],
                    ["Capabilities & use cases", preview.capabilitiesAndUseCases],
                    ["Differentiation & proof", preview.differentiationAndProof],
                  ] as const
                ).map(([title, items]) =>
                  items.length > 0 ? (
                    <div key={title}>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {title}
                      </h4>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-zinc-700">
                        {items.slice(0, 4).map((item) => (
                          <li key={`${title}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                {previewCount === 0 && (
                  <p className="text-xs text-zinc-400 sm:col-span-2">
                    Add structured details below to populate this preview.
                  </p>
                )}
              </div>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          sectionId="whyThem"
          open={openSection === "whyThem"}
          summary={summaries.whyThem}
          highlighted={highlightedSection === "whyThem"}
          onToggle={() => handleToggleSection("whyThem")}
        >
          <CollectionBlock
            title="Customer Problems"
            description="Important customer problems your offering addresses."
            addLabel="problem"
            isEmpty={draft.productKnowledge.customerProblems.length === 0}
            onAdd={() => {
              const item = createBlankCustomerProblem();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  customerProblems: [...draft.productKnowledge.customerProblems, item],
                },
              });
              setExpanded("customerProblems", item.id);
            }}
          >
            {draft.productKnowledge.customerProblems.map((problem: CustomerProblem) => (
              <ItemRow
                key={problem.id}
                primary={labelForProblem(problem)}
                secondary={problem.impact.trim() || undefined}
                expanded={isExpanded("customerProblems", problem.id)}
                onToggle={() => handleToggleItem("customerProblems", problem.id)}
                onRemove={() => {
                  markDirty(removeCustomerProblem(draft, problem.id));
                  setExpanded("customerProblems", null);
                }}
                removeLabel="problem"
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="Desired Outcomes"
            description="Business outcomes customers want."
            addLabel="outcome"
            isEmpty={draft.productKnowledge.desiredOutcomes.length === 0}
            onAdd={() => {
              const item = createBlankDesiredOutcome();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  desiredOutcomes: [...draft.productKnowledge.desiredOutcomes, item],
                },
              });
              setExpanded("desiredOutcomes", item.id);
            }}
          >
            {draft.productKnowledge.desiredOutcomes.map((outcome: DesiredOutcome) => (
              <ItemRow
                key={outcome.id}
                primary={labelForOutcome(outcome)}
                secondary={
                  outcome.problemIds.length
                    ? `${outcome.problemIds.length} related problem${outcome.problemIds.length === 1 ? "" : "s"}`
                    : undefined
                }
                expanded={isExpanded("desiredOutcomes", outcome.id)}
                onToggle={() => handleToggleItem("desiredOutcomes", outcome.id)}
                onRemove={() => {
                  markDirty(removeDesiredOutcome(draft, outcome.id));
                  setExpanded("desiredOutcomes", null);
                }}
                removeLabel="outcome"
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="Buying Reasons"
            description="Why customers buy."
            addLabel="buying reason"
            isEmpty={draft.productKnowledge.buyingReasons.length === 0}
            onAdd={() => {
              const item = createBlankBuyingReason();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  buyingReasons: [...draft.productKnowledge.buyingReasons, item],
                },
              });
              setExpanded("buyingReasons", item.id);
            }}
          >
            {draft.productKnowledge.buyingReasons.map((reason: BuyingReason) => (
              <ItemRow
                key={reason.id}
                primary={labelForBuyingReason(reason)}
                secondary={
                  reason.outcomeIds.length
                    ? `${reason.outcomeIds.length} related outcome${reason.outcomeIds.length === 1 ? "" : "s"}`
                    : undefined
                }
                expanded={isExpanded("buyingReasons", reason.id)}
                onToggle={() => handleToggleItem("buyingReasons", reason.id)}
                onRemove={() => {
                  markDirty(removeBuyingReason(draft, reason.id));
                  setExpanded("buyingReasons", null);
                }}
                removeLabel="buying reason"
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="ICP Criteria"
            description="Who the product is for."
            addLabel="criterion"
            isEmpty={draft.decisionStrategy.idealCustomerProfile.criteria.length === 0}
            onAdd={() => {
              const item = createBlankIcpCriterion();
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    criteria: [...draft.decisionStrategy.idealCustomerProfile.criteria, item],
                  },
                },
              });
              setExpanded("icpCriteria", item.id);
            }}
          >
            {draft.decisionStrategy.idealCustomerProfile.criteria.map(
              (criterion: IdealCustomerCriterion) => (
                <ItemRow
                  key={criterion.id}
                  primary={labelForCriterion(criterion)}
                  expanded={isExpanded("icpCriteria", criterion.id)}
                  onToggle={() => handleToggleItem("icpCriteria", criterion.id)}
                  onRemove={() => {
                    markDirty(removeIcpCriterion(draft, criterion.id));
                    setExpanded("icpCriteria", null);
                  }}
                  removeLabel="criterion"
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
                </ItemRow>
              ),
            )}
          </CollectionBlock>

          <CollectionBlock
            title="ICP Examples"
            description="Named example companies when known."
            addLabel="example"
            isEmpty={draft.decisionStrategy.idealCustomerProfile.examples.length === 0}
            onAdd={() => {
              const item = createBlankIcpExample();
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    examples: [...draft.decisionStrategy.idealCustomerProfile.examples, item],
                  },
                },
              });
              setExpanded("icpExamples", item.id);
            }}
          >
            {draft.decisionStrategy.idealCustomerProfile.examples.map(
              (example: IdealCustomerExample) => (
                <ItemRow
                  key={example.id}
                  primary={labelForIcpExample(example)}
                  secondary={example.rationale.trim() || undefined}
                  expanded={isExpanded("icpExamples", example.id)}
                  onToggle={() => handleToggleItem("icpExamples", example.id)}
                  onRemove={() => {
                    markDirty(removeIcpExample(draft, example.id));
                    setExpanded("icpExamples", null);
                  }}
                  removeLabel="example"
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
                    <span className="mb-0.5 block font-medium text-zinc-700">Relationship</span>
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
                                        relationship: event.target.value as IdealCustomerRelationship,
                                      }
                                    : item,
                              ),
                            },
                          },
                        })
                      }
                      className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm"
                    >
                      <option value="customer">Customer</option>
                      <option value="prospect">Prospect</option>
                      <option value="example-only">Example only</option>
                    </select>
                  </label>
                  <CompactReferencePicker
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
                </ItemRow>
              ),
            )}
          </CollectionBlock>
        </AccordionSection>

        <AccordionSection
          sectionId="whyNow"
          open={openSection === "whyNow"}
          summary={summaries.whyNow}
          highlighted={highlightedSection === "whyNow"}
          onToggle={() => handleToggleSection("whyNow")}
        >
          <CollectionBlock
            title="Why Now Signals"
            description="Timing and urgency signals."
            addLabel="signal"
            isEmpty={draft.decisionStrategy.whyNowSignals.length === 0}
            onAdd={() => {
              const item = createBlankWhyNowSignal();
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  whyNowSignals: [...draft.decisionStrategy.whyNowSignals, item],
                },
              });
              setExpanded("whyNowSignals", item.id);
            }}
          >
            {draft.decisionStrategy.whyNowSignals.map((signal: WhyNowSignal) => (
              <ItemRow
                key={signal.id}
                primary={labelForWhyNowSignal(signal)}
                secondary={signal.whyItMatters.trim() || undefined}
                expanded={isExpanded("whyNowSignals", signal.id)}
                onToggle={() => handleToggleItem("whyNowSignals", signal.id)}
                onRemove={() => {
                  markDirty(removeWhyNowSignal(draft, signal.id));
                  setExpanded("whyNowSignals", null);
                }}
                removeLabel="signal"
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
                <CompactReferencePicker
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>
        </AccordionSection>

        <AccordionSection
          sectionId="whyUs"
          open={openSection === "whyUs"}
          summary={summaries.whyUs}
          highlighted={highlightedSection === "whyUs"}
          onToggle={() => handleToggleSection("whyUs")}
        >
          <CollectionBlock
            title="Capabilities"
            description="What the product can do."
            addLabel="capability"
            isEmpty={draft.productKnowledge.capabilities.length === 0}
            onAdd={() => {
              const item = createBlankCapability();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  capabilities: [...draft.productKnowledge.capabilities, item],
                },
              });
              setExpanded("capabilities", item.id);
            }}
          >
            {draft.productKnowledge.capabilities.map((capability: Capability) => (
              <ItemRow
                key={capability.id}
                primary={labelForCapability(capability)}
                secondary={capability.description.trim() || undefined}
                expanded={isExpanded("capabilities", capability.id)}
                onToggle={() => handleToggleItem("capabilities", capability.id)}
                onRemove={() => {
                  markDirty(removeCapability(draft, capability.id));
                  setExpanded("capabilities", null);
                }}
                removeLabel="capability"
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
                <CompactReferencePicker
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="Use Cases"
            description="Concrete ways customers apply the product."
            addLabel="use case"
            isEmpty={draft.productKnowledge.useCases.length === 0}
            onAdd={() => {
              const item = createBlankUseCase();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  useCases: [...draft.productKnowledge.useCases, item],
                },
              });
              setExpanded("useCases", item.id);
            }}
          >
            {draft.productKnowledge.useCases.map((useCase: UseCase) => (
              <ItemRow
                key={useCase.id}
                primary={labelForUseCase(useCase)}
                secondary={useCase.description.trim() || undefined}
                expanded={isExpanded("useCases", useCase.id)}
                onToggle={() => handleToggleItem("useCases", useCase.id)}
                onRemove={() => {
                  markDirty(removeUseCase(draft, useCase.id));
                  setExpanded("useCases", null);
                }}
                removeLabel="use case"
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
                <CompactReferencePicker
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
                <CompactReferencePicker
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="Common Alternatives"
            description="Alternatives buyers compare against."
            addLabel="alternative"
            isEmpty={draft.productKnowledge.commonAlternatives.length === 0}
            onAdd={() => {
              const item = createBlankCommonAlternative();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  commonAlternatives: [...draft.productKnowledge.commonAlternatives, item],
                },
              });
              setExpanded("commonAlternatives", item.id);
            }}
          >
            {draft.productKnowledge.commonAlternatives.map((alternative: CommonAlternative) => (
              <ItemRow
                key={alternative.id}
                primary={labelForAlternative(alternative)}
                secondary={alternative.description.trim() || undefined}
                expanded={isExpanded("commonAlternatives", alternative.id)}
                onToggle={() => handleToggleItem("commonAlternatives", alternative.id)}
                onRemove={() => {
                  markDirty(removeCommonAlternative(draft, alternative.id));
                  setExpanded("commonAlternatives", null);
                }}
                removeLabel="alternative"
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
              </ItemRow>
            ))}
          </CollectionBlock>

          <CollectionBlock
            title="Relevant Differentiation"
            description="How you differ from those alternatives."
            addLabel="differentiation"
            isEmpty={draft.productKnowledge.relevantDifferentiation.length === 0}
            onAdd={() => {
              const item = createBlankRelevantDifferentiation();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  relevantDifferentiation: [
                    ...draft.productKnowledge.relevantDifferentiation,
                    item,
                  ],
                },
              });
              setExpanded("relevantDifferentiation", item.id);
            }}
          >
            {draft.productKnowledge.relevantDifferentiation.map(
              (differentiation: RelevantDifferentiation) => (
                <ItemRow
                  key={differentiation.id}
                  primary={labelForDifferentiation(differentiation)}
                  expanded={isExpanded("relevantDifferentiation", differentiation.id)}
                  onToggle={() => handleToggleItem("relevantDifferentiation", differentiation.id)}
                  onRemove={() => {
                    markDirty(removeRelevantDifferentiation(draft, differentiation.id));
                    setExpanded("relevantDifferentiation", null);
                  }}
                  removeLabel="differentiation"
                >
                  <TextAreaField
                    label="Statement"
                    value={differentiation.statement}
                    onChange={(value) =>
                      markDirty({
                        ...draft,
                        productKnowledge: {
                          ...draft.productKnowledge,
                          relevantDifferentiation:
                            draft.productKnowledge.relevantDifferentiation.map((item) =>
                              item.id === differentiation.id ? { ...item, statement: value } : item,
                            ),
                        },
                      })
                    }
                  />
                  <CompactReferencePicker
                    label="Related alternatives"
                    options={alternativeOptions}
                    selectedIds={differentiation.alternativeIds}
                    emptyHint="Add common alternatives first to link them here."
                    onChange={(alternativeIds) =>
                      markDirty({
                        ...draft,
                        productKnowledge: {
                          ...draft.productKnowledge,
                          relevantDifferentiation:
                            draft.productKnowledge.relevantDifferentiation.map((item) =>
                              item.id === differentiation.id
                                ? { ...item, alternativeIds }
                                : item,
                            ),
                        },
                      })
                    }
                  />
                  <CompactReferencePicker
                    label="Related problems"
                    options={problemOptions}
                    selectedIds={differentiation.problemIds}
                    emptyHint="Add customer problems first to link them here."
                    onChange={(problemIds) =>
                      markDirty({
                        ...draft,
                        productKnowledge: {
                          ...draft.productKnowledge,
                          relevantDifferentiation:
                            draft.productKnowledge.relevantDifferentiation.map((item) =>
                              item.id === differentiation.id ? { ...item, problemIds } : item,
                            ),
                        },
                      })
                    }
                  />
                  <CompactReferencePicker
                    label="Related outcomes"
                    options={outcomeOptions}
                    selectedIds={differentiation.outcomeIds}
                    emptyHint="Add desired outcomes first to link them here."
                    onChange={(outcomeIds) =>
                      markDirty({
                        ...draft,
                        productKnowledge: {
                          ...draft.productKnowledge,
                          relevantDifferentiation:
                            draft.productKnowledge.relevantDifferentiation.map((item) =>
                              item.id === differentiation.id ? { ...item, outcomeIds } : item,
                            ),
                        },
                      })
                    }
                  />
                </ItemRow>
              ),
            )}
          </CollectionBlock>

          <CollectionBlock
            title="Proof Points"
            description="Evidence that substantiates your claims."
            addLabel="proof point"
            isEmpty={draft.productKnowledge.proofPoints.length === 0}
            onAdd={() => {
              const item = createBlankProofPoint();
              markDirty({
                ...draft,
                productKnowledge: {
                  ...draft.productKnowledge,
                  proofPoints: [...draft.productKnowledge.proofPoints, item],
                },
              });
              setExpanded("proofPoints", item.id);
            }}
          >
            {draft.productKnowledge.proofPoints.map((proofPoint: ProofPoint) => (
              <ItemRow
                key={proofPoint.id}
                primary={labelForProofPoint(proofPoint)}
                secondary={proofPoint.customerName?.trim() || undefined}
                expanded={isExpanded("proofPoints", proofPoint.id)}
                onToggle={() => handleToggleItem("proofPoints", proofPoint.id)}
                onRemove={() => {
                  markDirty(removeProofPoint(draft, proofPoint.id));
                  setExpanded("proofPoints", null);
                }}
                removeLabel="proof point"
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
                          item.id === proofPoint.id
                            ? { ...item, metric: value || undefined }
                            : item,
                        ),
                      },
                    })
                  }
                />
                <CompactReferencePicker
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
                <CompactReferencePicker
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
              </ItemRow>
            ))}
          </CollectionBlock>
        </AccordionSection>

        <AccordionSection
          sectionId="disqualifiers"
          open={openSection === "disqualifiers"}
          summary={summaries.disqualifiers}
          highlighted={highlightedSection === "disqualifiers"}
          onToggle={() => handleToggleSection("disqualifiers")}
        >
          <CollectionBlock
            title="Firmographic Disqualifiers"
            description="Firmographic conditions that make a company a poor fit (Why Them)."
            addLabel="disqualifier"
            isEmpty={
              draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.length === 0
            }
            onAdd={() => {
              const item = createBlankFirmographicDisqualifier();
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  idealCustomerProfile: {
                    ...draft.decisionStrategy.idealCustomerProfile,
                    firmographicDisqualifiers: [
                      ...draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers,
                      item,
                    ],
                  },
                },
              });
              setExpanded("firmographicDisqualifiers", item.id);
            }}
          >
            {draft.decisionStrategy.idealCustomerProfile.firmographicDisqualifiers.map(
              (disqualifier: FirmographicDisqualifier) => (
                <ItemRow
                  key={disqualifier.id}
                  primary={labelForFirmographicDisqualifier(disqualifier)}
                  secondary={disqualifier.whyItMatters.trim() || undefined}
                  expanded={isExpanded("firmographicDisqualifiers", disqualifier.id)}
                  onToggle={() => handleToggleItem("firmographicDisqualifiers", disqualifier.id)}
                  onRemove={() => {
                    markDirty(removeFirmographicDisqualifier(draft, disqualifier.id));
                    setExpanded("firmographicDisqualifiers", null);
                  }}
                  removeLabel="disqualifier"
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
                                  item.id === disqualifier.id
                                    ? { ...item, condition: value }
                                    : item,
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
                </ItemRow>
              ),
            )}
          </CollectionBlock>

          <CollectionBlock
            title="Red Flags"
            description="Conditions that caution against or disqualify an account (Why Them and/or Why Us)."
            addLabel="red flag"
            isEmpty={draft.decisionStrategy.redFlags.length === 0}
            onAdd={() => {
              const item = createBlankRedFlag();
              markDirty({
                ...draft,
                decisionStrategy: {
                  ...draft.decisionStrategy,
                  redFlags: [...draft.decisionStrategy.redFlags, item],
                },
              });
              setExpanded("redFlags", item.id);
            }}
          >
            {draft.decisionStrategy.redFlags.map((redFlag: RedFlag) => (
              <ItemRow
                key={redFlag.id}
                primary={labelForRedFlag(redFlag)}
                secondary={`${redFlag.severity === "disqualifying" ? "Disqualifying" : "Cautionary"}${
                  redFlag.affectedDecisionGroups.length
                    ? ` · ${redFlag.affectedDecisionGroups
                        .map((group) => (group === "whyThem" ? "Why Them" : "Why Us"))
                        .join(", ")}`
                    : ""
                }`}
                expanded={isExpanded("redFlags", redFlag.id)}
                onToggle={() => handleToggleItem("redFlags", redFlag.id)}
                onRemove={() => {
                  markDirty(removeRedFlag(draft, redFlag.id));
                  setExpanded("redFlags", null);
                }}
                removeLabel="red flag"
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
                  <span className="mb-0.5 block font-medium text-zinc-700">Severity</span>
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
                    className="w-full rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm"
                  >
                    <option value="cautionary">Cautionary</option>
                    <option value="disqualifying">Disqualifying</option>
                  </select>
                </label>
                <fieldset className="block text-sm">
                  <span className="mb-0.5 block font-medium text-zinc-700">
                    Affected decision groups
                  </span>
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
              </ItemRow>
            ))}
          </CollectionBlock>
        </AccordionSection>
      </div>

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
        <p className="text-sm font-medium text-green-700">
          Approved (ready for the parent to save).
        </p>
      )}

      <div className="flex justify-end border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isSaving}
          className="rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSaving ? "Validating..." : "Approve"}
        </button>
      </div>
    </section>
  );
}
