import type { Role, UserProfile } from "../types";

export function hasRole(profile: UserProfile | null, roles: Role[]) {
  return Boolean(profile && roles.includes(profile.role));
}

export function isOwner(profile: UserProfile | null) {
  return profile?.role === "owner";
}

export function isBarber(profile: UserProfile | null) {
  return profile?.role === "barber";
}

export function isCustomer(profile: UserProfile | null) {
  return profile?.role === "customer";
}

export function sameBusiness(profile: UserProfile | null, businessId: string) {
  return Boolean(profile && profile.businessId === businessId);
}

export function sameBranch(profile: UserProfile | null, branchId?: string) {
  if (!profile || !branchId) return false;
  return profile.role === "owner" || profile.branchId === branchId;
}

export function canManageBranch(profile: UserProfile | null, branchId?: string) {
  return Boolean(profile && profile.role === "owner" && profile.businessId && branchId);
}
