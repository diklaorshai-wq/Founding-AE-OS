/**
 * Configurable decision strategy model defining how a GTM organization
 * prioritizes accounts for outbound investment before an opportunity exists.
 *
 * This strategy is evaluated by the Enterprise Decision Framework (EDF)
 * together with the Company Profile.
 */

export enum SignalCategory {
  Business = "business",
  Technology = "technology",
  Organizational = "organizational",
  Competitive = "competitive",
  Financial = "financial",
  Regulatory = "regulatory",
  Other = "other",
}

export enum RedFlagSeverity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export interface StrategyCriterion {
  id: string;
  label: string;
  description?: string;
  weight?: number;
  targetValues?: string[];
  required?: boolean;
}

export interface IcpDefinition {
  targetIndustries?: string[];
  targetCompanySizes?: string[];
  targetGeographies?: string[];
  targetBusinessModels?: string[];
  exclusionCriteria?: string[];
  criteria: StrategyCriterion[];
}

export interface StrategicPriority {
  id: string;
  label: string;
  description?: string;
  weight?: number;
  relatedInitiatives?: string[];
}

export interface StrategicPriorities {
  priorities: StrategicPriority[];
}

export interface WhyNowSignal {
  id: string;
  label: string;
  description?: string;
  category?: SignalCategory;
  indicators?: string[];
  weight?: number;
}

export interface WhyNowSignals {
  signals: WhyNowSignal[];
}

export interface ProspectingSignal {
  id: string;
  label: string;
  description?: string;
  category?: SignalCategory;
  indicators?: string[];
}

export interface ProspectingSignals {
  signals: ProspectingSignal[];
}

export interface RedFlag {
  id: string;
  label: string;
  description?: string;
  severity?: RedFlagSeverity;
  disqualifying?: boolean;
}

export interface RedFlags {
  flags: RedFlag[];
}

export interface DecisionStrategy {
  id?: string;
  name?: string;
  version?: string;
  icp: IcpDefinition;
  strategicPriorities: StrategicPriorities;
  whyNowSignals: WhyNowSignals;
  prospectingSignals: ProspectingSignals;
  redFlags: RedFlags;
}
