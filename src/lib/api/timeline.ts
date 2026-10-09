import { get } from "./client";
import { adaptTimelineEvent } from "./adapters";
import type { TimelineEventDTO, TimelineFilters } from "./types";
export async function getTimelineEvents(companyId: string, filters: TimelineFilters = {}) {
  return (
    await get<TimelineEventDTO[]>(`/companies/${encodeURIComponent(companyId)}/timeline-events`, {
      ...filters,
    })
  ).map(adaptTimelineEvent);
}
export async function getTimelineEvent(companyId: string, id: string) {
  return adaptTimelineEvent(
    await get<TimelineEventDTO>(
      `/companies/${encodeURIComponent(companyId)}/timeline-events/${encodeURIComponent(id)}`,
    ),
  );
}
