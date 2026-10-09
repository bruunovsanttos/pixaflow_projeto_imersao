import { get, put } from "./client";
import { adaptUser, adaptMembership, adaptPreferences, adaptPreferencesUpdate } from "./adapters";
import type { UserDTO, MembershipDTO, PreferencesDTO, Pagination, PreferenceValues } from "./types";
export async function getUser(userId: string) {
  return adaptUser(await get<UserDTO>(`/users/${encodeURIComponent(userId)}`));
}
export async function getCompanyMemberships(companyId: string, filters: Pagination = {}) {
  return (
    await get<MembershipDTO[]>(`/companies/${encodeURIComponent(companyId)}/memberships`, {
      ...filters,
    })
  ).map(adaptMembership);
}
export async function getMembershipPreferences(membershipId: string) {
  return adaptPreferences(
    await get<PreferencesDTO>(`/memberships/${encodeURIComponent(membershipId)}/preferences`),
  );
}

export async function updateMembershipPreferences(membershipId: string, value: PreferenceValues) {
  return adaptPreferences(
    await put<PreferencesDTO>(
      `/memberships/${encodeURIComponent(membershipId)}/preferences`,
      adaptPreferencesUpdate(value),
    ),
  );
}
