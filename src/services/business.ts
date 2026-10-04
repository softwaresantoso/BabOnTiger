import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import type { Branch, Business } from "../types";

export const businessDoc = () => doc(db, "businesses", BUSINESS_ID);
export const businessCollection = (name: string) => collection(db, "businesses", BUSINESS_ID, name);
export const branchDoc = (branchId: string) => doc(db, "businesses", BUSINESS_ID, "branches", branchId);

export async function getBusiness(): Promise<Business | null> {
  const snap = await getDoc(businessDoc());
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Business) : null;
}

export async function getActiveBranches(): Promise<Branch[]> {
  const snap = await getDocs(query(businessCollection("branches"), where("active", "==", true), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
}


export async function getAllBranches(): Promise<Branch[]> {
  const snap = await getDocs(
    query(businessCollection("branches"), orderBy("name"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
}

export async function createBranch(input: {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  active?: boolean;
}) {
  const ref = await addDoc(businessCollection("branches"), {
    businessId: BUSINESS_ID,
    name: input.name.trim(),
    ...(input.code?.trim() ? { code: input.code.trim().toUpperCase() } : {}),
    ...(input.address?.trim() ? { address: input.address.trim() } : {}),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    active: input.active ?? true,
    queueSettings: { resetDaily: true, prefix: "Q" },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBranch(branchId: string, input: {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  active: boolean;
}) {
  await updateDoc(branchDoc(branchId), {
    name: input.name.trim(),
    code: input.code?.trim() ? input.code.trim().toUpperCase() : "",
    address: input.address?.trim() || "",
    phone: input.phone?.trim() || "",
    active: input.active,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBranch(branchId: string) {
  await deleteDoc(branchDoc(branchId));
}

export async function getBranch(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(branchDoc(branchId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Branch) : null;
}

export async function updateBusiness(input: Partial<Omit<Business, "id">>) {
  await updateDoc(businessDoc(), { ...input, updatedAt: serverTimestamp() });
}
