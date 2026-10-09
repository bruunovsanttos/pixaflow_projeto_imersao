import type {
  Company,
  Risk,
  Opportunity,
  TimelineEvent,
  Severity,
  DemoSettings,
} from "../mock-data";

/** JSON UUIDs and ISO dates remain strings; timestamps retain their UTC offset. */
export interface TimestampsDTO {
  created_at: string;
  updated_at: string;
}
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}
export interface CompanyDTO extends TimestampsDTO {
  id: string;
  slug: string;
  name: string;
  segment: string;
}
export interface UserDTO extends TimestampsDTO {
  id: string;
  name: string;
  email: string;
}
export interface MembershipDTO extends TimestampsDTO {
  id: string;
  company_id: string;
  user_id: string;
  job_title: string;
}
export interface PreferencesDTO extends TimestampsDTO {
  membership_id: string;
  alert_risks: boolean;
  alert_opportunities: boolean;
  alert_weekly: boolean;
  alert_capacity: boolean;
  horizon_days: number;
  sensitivity: DemoSettings["sensitivity"];
}
export interface RecommendationDTO {
  id: string;
  position: number;
  text: string;
}
interface AnalysisDTO extends TimestampsDTO {
  id: string;
  company_id: string;
  analysis_run_id: string | null;
}
export interface RiskDTO extends AnalysisDTO {
  title: string;
  category: Risk["category"];
  description: string;
  detail: string;
  cause: string;
  probability: string;
  impact_amount: string;
  deadline_at: string | null;
  deadline_description: string;
  status: Risk["status"];
  severity: Severity;
  recommendations: RecommendationDTO[];
}
export type BenefitType = "revenue" | "cost_saving";
export interface OpportunityDTO extends AnalysisDTO {
  title: string;
  description: string;
  action: string;
  benefit_type: BenefitType;
  potential_amount: string;
  cost_amount: string;
  extra_clients: number;
  effort: Opportunity["effort"];
  horizon_days: number;
  confidence: string;
  roi: string | null;
}
export interface TimelineEventDTO extends AnalysisDTO {
  event_date: string;
  title: string;
  severity: Severity;
  description: string;
  cause: string;
  impact_description: string;
  recommendations: RecommendationDTO[];
}
interface AnalysisMetadata extends Timestamps {
  companyId: string;
  analysisRunId: string | null;
}
export interface ApiCompany extends Company, Timestamps {
  slug: string;
}
export interface User extends Timestamps {
  id: string;
  name: string;
  email: string;
}
export interface Membership extends Timestamps {
  id: string;
  companyId: string;
  userId: string;
  jobTitle: string;
}
export interface MembershipPreferences extends Timestamps {
  membershipId: string;
  alerts: DemoSettings["alerts"];
  horizon: DemoSettings["horizon"];
  sensitivity: DemoSettings["sensitivity"];
}
export interface ApiRisk extends Risk, AnalysisMetadata {
  deadlineAt: string | null;
}
export interface ApiOpportunity extends Opportunity, AnalysisMetadata {
  benefitType: BenefitType;
  potentialAmount: number;
  horizonDays: number;
}
export interface ApiTimelineEvent extends TimelineEvent, AnalysisMetadata {}
export interface Pagination {
  offset?: number;
  limit?: number;
}
export interface RiskFilters extends Pagination {
  category?: Risk["category"];
  severity?: Severity;
  status?: Risk["status"];
}
export interface OpportunityFilters extends Pagination {
  effort?: Opportunity["effort"];
  benefit_type?: BenefitType;
}
export interface TimelineFilters extends Pagination {
  severity?: Severity;
  data_inicio?: string;
  data_fim?: string;
}

export type PreferenceValues = Pick<MembershipPreferences, "alerts" | "horizon" | "sensitivity">;
export type PreferencesUpdateDTO = Pick<
  PreferencesDTO,
  | "alert_risks"
  | "alert_opportunities"
  | "alert_weekly"
  | "alert_capacity"
  | "horizon_days"
  | "sensitivity"
>;
