import { generateMockDecision } from "./mock-provider";
import type { DecisionEngineInput, DecisionEngineOutput } from "./types";

export type { DecisionEngineInput, DecisionEngineOutput } from "./types";

export function generateDecision(input: DecisionEngineInput): DecisionEngineOutput {
  return generateMockDecision(input);
}
