import { z } from "zod";
import { getCompanies, getCompany } from "./companies";
import { getCompanyMemberships, getUser, getMembershipPreferences } from "./users";
import { settingsSchema, type DemoSettings } from "../mock-data";
import type { ApiCompany, User, Membership, MembershipPreferences } from "./types";

const timestamps = { createdAt: z.string(), updatedAt: z.string() };
const companySchema: z.ZodType<ApiCompany> = z.object({
  ...timestamps,
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string().min(1),
  segment: z.string(),
});
const userSchema: z.ZodType<User> = z.object({
  ...timestamps,
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});
const membershipSchema: z.ZodType<Membership> = z.object({
  ...timestamps,
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  jobTitle: z.string().min(1),
});
export const preferencesSchema: z.ZodType<MembershipPreferences> = z.object({
  ...timestamps,
  membershipId: z.string().uuid(),
  alerts: settingsSchema.shape.alerts,
  horizon: settingsSchema.shape.horizon,
  sensitivity: settingsSchema.shape.sensitivity,
});
export interface Identity {
  company: ApiCompany;
  user: User;
  membership: Membership;
  preferences: MembershipPreferences;
  settings: DemoSettings;
}
export function identitySettings(
  user: User,
  membership: Membership,
  preferences: MembershipPreferences,
): DemoSettings {
  return settingsSchema.parse({
    name: user.name,
    email: user.email,
    role: membership.jobTitle,
    alerts: preferences.alerts,
    horizon: preferences.horizon,
    sensitivity: preferences.sensitivity,
  });
}
export async function withIdentityTimeout<T>(
  load: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Tempo limite ao carregar a identidade."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([load(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Development bootstrap, NOT authentication. API ordering determines the initial company.
 * No mock slug, hardcoded UUID or user email participates in selecting real data.
 */
export async function loadCurrentCompany(): Promise<ApiCompany> {
  return withIdentityTimeout(async (signal) => {
    const candidates = z.array(companySchema).parse(await getCompanies({ offset: 0, limit: 1 }));
    signal.throwIfAborted();
    const initial = candidates[0];
    if (!initial) throw new Error("Nenhuma empresa disponível.");
    const company = companySchema.parse(await getCompany(initial.id));
    if (company.id !== initial.id) throw new Error("Empresa inconsistente na resposta.");
    return company;
  });
}
export async function loadIdentity(company: ApiCompany): Promise<Identity> {
  return withIdentityTimeout(async (signal) => {
    const memberships = z
      .array(membershipSchema)
      .parse(await getCompanyMemberships(company.id, { offset: 0, limit: 1 }));
    signal.throwIfAborted();
    const membership = memberships[0];
    if (!membership) throw new Error("A empresa não possui vínculo de usuário.");
    if (membership.companyId !== company.id) throw new Error("Vínculo de outra empresa.");
    const [userResult, preferencesResult] = await Promise.all([
      getUser(membership.userId),
      getMembershipPreferences(membership.id),
    ]);
    signal.throwIfAborted();
    const user = userSchema.parse(userResult);
    const preferences = preferencesSchema.parse(preferencesResult);
    if (user.id !== membership.userId || preferences.membershipId !== membership.id)
      throw new Error("Identidade inconsistente na resposta.");
    return {
      company,
      user,
      membership,
      preferences,
      settings: identitySettings(user, membership, preferences),
    };
  });
}
export function profileInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
