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
