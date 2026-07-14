import type { EntityId, VendorProfile } from "./vendorProfile";

function checkReferences(
  errors: string[],
  owner: string,
  references: EntityId[],
  validIds: Set<EntityId>,
  target: string,
) {
  for (const reference of references) {
    if (!validIds.has(reference)) {
      errors.push(`${owner} references unknown ${target} "${reference}".`);
    }
  }
}

/** Validates links inside a Vendor Profile without evaluating an account. */
export function validateVendorProfile(profile: VendorProfile): string[] {
  const errors: string[] = [];
  const knowledge = profile.productKnowledge;
  const strategy = profile.decisionStrategy;

  const problemIds = new Set(knowledge.customerProblems.map(({ id }) => id));
  const outcomeIds = new Set(knowledge.desiredOutcomes.map(({ id }) => id));
  const capabilityIds = new Set(knowledge.capabilities.map(({ id }) => id));
  const useCaseIds = new Set(knowledge.useCases.map(({ id }) => id));
  const alternativeIds = new Set(knowledge.commonAlternatives.map(({ id }) => id));
  const criterionIds = new Set(
    strategy.idealCustomerProfile.criteria.map(({ id }) => id),
  );
  const personaIds = new Set(strategy.targetPersonas.map(({ id }) => id));

  for (const outcome of knowledge.desiredOutcomes) {
    checkReferences(errors, `Desired outcome "${outcome.id}"`, outcome.problemIds, problemIds, "problem");
  }

  for (const reason of knowledge.buyingReasons) {
    checkReferences(errors, `Buying reason "${reason.id}"`, reason.outcomeIds, outcomeIds, "outcome");
  }

  for (const capability of knowledge.capabilities) {
    checkReferences(errors, `Capability "${capability.id}"`, capability.problemIds, problemIds, "problem");
    checkReferences(errors, `Capability "${capability.id}"`, capability.outcomeIds, outcomeIds, "outcome");
  }

  for (const useCase of knowledge.useCases) {
    checkReferences(errors, `Use case "${useCase.id}"`, useCase.problemIds, problemIds, "problem");
    checkReferences(errors, `Use case "${useCase.id}"`, useCase.outcomeIds, outcomeIds, "outcome");
    checkReferences(errors, `Use case "${useCase.id}"`, useCase.capabilityIds, capabilityIds, "capability");
  }

  for (const differentiation of knowledge.relevantDifferentiation) {
    checkReferences(errors, `Differentiation "${differentiation.id}"`, differentiation.alternativeIds, alternativeIds, "alternative");
    checkReferences(errors, `Differentiation "${differentiation.id}"`, differentiation.problemIds, problemIds, "problem");
    checkReferences(errors, `Differentiation "${differentiation.id}"`, differentiation.outcomeIds, outcomeIds, "outcome");
  }

  for (const proofPoint of knowledge.proofPoints) {
    checkReferences(errors, `Proof point "${proofPoint.id}"`, proofPoint.outcomeIds, outcomeIds, "outcome");
    checkReferences(errors, `Proof point "${proofPoint.id}"`, proofPoint.useCaseIds, useCaseIds, "use case");
  }

  for (const example of strategy.idealCustomerProfile.examples) {
    checkReferences(errors, `ICP example "${example.id}"`, example.criterionIds, criterionIds, "ICP criterion");
  }

  for (const persona of strategy.targetPersonas) {
    checkReferences(errors, `Persona "${persona.id}"`, persona.problemIds, problemIds, "problem");
    checkReferences(errors, `Persona "${persona.id}"`, persona.outcomeIds, outcomeIds, "outcome");
  }

  for (const budgetOwner of strategy.budgetOwners) {
    checkReferences(
      errors,
      `Budget owner "${budgetOwner.id}"`,
      budgetOwner.relatedPersonaIds,
      personaIds,
      "persona",
    );
  }

  for (const signal of strategy.whyNowSignals) {
    checkReferences(errors, `Why Now signal "${signal.id}"`, signal.problemIds, problemIds, "problem");
    checkReferences(errors, `Why Now signal "${signal.id}"`, signal.outcomeIds, outcomeIds, "outcome");
  }

  return errors;
}
