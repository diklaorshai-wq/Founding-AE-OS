/**
 * Universal company attribute model describing observable facts about an account
 * being evaluated. Independent of any specific product or customer strategy.
 */

export enum DataConfidence {
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum OwnershipType {
  Public = "public",
  Private = "private",
  Subsidiary = "subsidiary",
  Other = "other",
}

export enum GrowthStage {
  Startup = "startup",
  ScaleUp = "scale-up",
  Growth = "growth",
  Mature = "mature",
  Enterprise = "enterprise",
}

export enum GrowthTrend {
  Accelerating = "accelerating",
  Stable = "stable",
  Decelerating = "decelerating",
  Unknown = "unknown",
}

export interface AttributeSource {
  name: string;
  url?: string;
  retrievedAt?: string;
}

export interface ObservableAttribute<T> {
  value: T;
  confidence?: DataConfidence;
  sources?: AttributeSource[];
  lastUpdatedAt?: string;
  notes?: string;
}

export interface AttributeMetadata {
  lastUpdatedAt?: string;
  sources?: AttributeSource[];
  confidence?: DataConfidence;
  completeness?: number;
  gaps?: string[];
  notes?: string;
}

export interface BusinessProfile {
  companyName: string;
  legalName?: string;
  description?: string;
  industry?: string;
  subIndustries?: string[];
  businessModel?: string;
  targetMarket?: string;
  employeeCount?: ObservableAttribute<number>;
  employeeCountRange?: string;
  annualRevenue?: ObservableAttribute<number>;
  revenueRange?: string;
  headquarters?: string;
  operatingRegions?: string[];
  foundedYear?: number;
  ownershipType?: ObservableAttribute<OwnershipType>;
  parentCompany?: string;
  strategicInitiatives?: string[];
  keyBusinessObjectives?: string[];
}

export interface TechnologyProfile {
  primaryTechStack?: string[];
  cloudProviders?: string[];
  developmentPlatforms?: string[];
  dataInfrastructure?: string[];
  securityAndCompliance?: string[];
  engineeringHeadcount?: ObservableAttribute<number>;
  engineeringOrganizationSize?: string;
  digitalMaturity?: string;
  architectureStyle?: ObservableAttribute<string>;
  dataScale?: ObservableAttribute<string>;
  technologyInitiatives?: string[];
  architectureNotes?: string;
}

export interface GrowthProfile {
  growthStage?: GrowthStage;
  fundingStage?: ObservableAttribute<string>;
  totalFunding?: number;
  lastFundingDate?: string;
  headcountTrend?: ObservableAttribute<GrowthTrend>;
  revenueTrend?: ObservableAttribute<GrowthTrend>;
  executiveChanges?: ObservableAttribute<string[]>;
  expansionSignals?: string[];
  recentMilestones?: string[];
}

export interface MarketProfile {
  marketSegment?: string;
  competitivePosition?: string;
  primaryCompetitors?: string[];
  marketTrends?: string[];
  regulatoryEnvironment?: string[];
  customerBaseDescription?: string;
  geographicMarkets?: string[];
}

export interface CompanyProfile {
  businessProfile: BusinessProfile;
  technologyProfile: TechnologyProfile;
  growthProfile: GrowthProfile;
  marketProfile: MarketProfile;
  metadata: AttributeMetadata;
}
