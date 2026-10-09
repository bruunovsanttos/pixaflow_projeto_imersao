import type { PreferenceValues, PreferencesUpdateDTO } from "./types";
import type {
  TimestampsDTO,
  Timestamps,
  CompanyDTO,
  ApiCompany,
  UserDTO,
  User,
  MembershipDTO,
  Membership,
  PreferencesDTO,
  MembershipPreferences,
  RiskDTO,
  ApiRisk,
  OpportunityDTO,
  ApiOpportunity,
  TimelineEventDTO,
  ApiTimelineEvent,
  RecommendationDTO,
} from "./types";

/** Never parse date-only values as Date or remove the timestamp's timezone. */
const timestamps = (dto: TimestampsDTO): Timestamps => ({
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
});
function decimal(value: string): number {
  const parsed = Number(value);
  if (value.trim() === "" || !Number.isFinite(parsed))
    throw new Error("Valor decimal inválido na resposta da API.");
  return parsed;
}
const recommendations = (items: RecommendationDTO[]): string[] =>
  [...items].sort((a, b) => a.position - b.position).map((item) => item.text);

export const adaptCompany = (dto: CompanyDTO): ApiCompany => ({
  id: dto.id,
  slug: dto.slug,
  name: dto.name,
  segment: dto.segment,
  ...timestamps(dto),
});
export const adaptUser = (dto: UserDTO): User => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  ...timestamps(dto),
});
export const adaptMembership = (dto: MembershipDTO): Membership => ({
  id: dto.id,
  companyId: dto.company_id,
  userId: dto.user_id,
  jobTitle: dto.job_title,
  ...timestamps(dto),
});
export function adaptPreferences(dto: PreferencesDTO): MembershipPreferences {
  const horizon = String(dto.horizon_days);
  if (horizon !== "7" && horizon !== "15" && horizon !== "30")
    throw new Error("Horizonte inválido na resposta da API.");
  return {
    membershipId: dto.membership_id,
    alerts: {
      risks: dto.alert_risks,
      opps: dto.alert_opportunities,
      weekly: dto.alert_weekly,
      capacity: dto.alert_capacity,
    },
    horizon,
    sensitivity: dto.sensitivity,
    ...timestamps(dto),
  };
}
export const adaptRisk = (dto: RiskDTO): ApiRisk => ({
  id: dto.id,
  companyId: dto.company_id,
  analysisRunId: dto.analysis_run_id,
  title: dto.title,
  category: dto.category,
  description: dto.description,
  detail: dto.detail,
  cause: dto.cause,
  probability: decimal(dto.probability),
  impact: decimal(dto.impact_amount),
  deadline: dto.deadline_description,
  deadlineAt: dto.deadline_at,
  status: dto.status,
  severity: dto.severity,
  recommendations: recommendations(dto.recommendations),
  ...timestamps(dto),
});
export const adaptOpportunity = (dto: OpportunityDTO): ApiOpportunity => ({
  id: dto.id,
  companyId: dto.company_id,
  analysisRunId: dto.analysis_run_id,
  title: dto.title,
  description: dto.description,
  action: dto.action,
  benefitType: dto.benefit_type,
  potentialAmount: decimal(dto.potential_amount),
  // Legacy display field represents the potential benefit, including cost savings.
  potentialRevenue: decimal(dto.potential_amount),
  cost: decimal(dto.cost_amount),
  roi: dto.roi === null ? null : decimal(dto.roi),
  extraClients: dto.extra_clients,
  effort: dto.effort,
  horizonDays: dto.horizon_days,
  horizon: `${dto.horizon_days} ${dto.horizon_days === 1 ? "dia" : "dias"}`,
  confidence: decimal(dto.confidence),
  ...timestamps(dto),
});
export const adaptTimelineEvent = (dto: TimelineEventDTO): ApiTimelineEvent => ({
  id: dto.id,
  companyId: dto.company_id,
  analysisRunId: dto.analysis_run_id,
  date: dto.event_date,
  title: dto.title,
  severity: dto.severity,
  description: dto.description,
  cause: dto.cause,
  impact: dto.impact_description,
  recommendations: recommendations(dto.recommendations),
  ...timestamps(dto),
});

export function adaptPreferencesUpdate(value: PreferenceValues): PreferencesUpdateDTO {
  return {
    alert_risks: value.alerts.risks,
    alert_opportunities: value.alerts.opps,
    alert_weekly: value.alerts.weekly,
    alert_capacity: value.alerts.capacity,
    horizon_days: Number(value.horizon),
    sensitivity: value.sensitivity,
  };
}
