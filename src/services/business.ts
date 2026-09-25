import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, BUSINESS_ID } from "../lib/firebase";
import type { Branch, Business } from "../types";

export const businessDoc = () =>
  doc(db, "businesses", BUSINESS_ID);

export const businessCollection = (name: string) =>
  collection(db, "businesses", BUSINESS_ID, name);

export const branchDoc = (branchId: string) =>
  doc(
    db,
    "businesses",
    BUSINESS_ID,
    "branches",
    branchId
  );

export async function getBusiness(): Promise<Business | null> {
  const snap = await getDoc(businessDoc());

  return snap.exists()
    ? ({ id: snap.id, ...snap.data() } as Business)
    : null;
}

export async function getActiveBranches(): Promise<Branch[]> {
  const snap = await getDocs(
    query(
      businessCollection("branches"),
      where("active", "==", true),
      orderBy("name")
    )
  );

  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Branch)
  );
}

export async function getAllBranches(): Promise<Branch[]> {
  const snap = await getDocs(
    query(
      businessCollection("branches"),
      orderBy("name")
    )
  );

  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Branch)
  );
}

export async function getBranch(
  branchId: string
): Promise<Branch | null> {
  const snap = await getDoc(branchDoc(branchId));

  return snap.exists()
    ? ({ id: snap.id, ...snap.data() } as Branch)
    : null;
}

export async function saveBranch(
  input: Omit<Branch, "id">,
  id?: string
) {
  if (id) {
    await updateDoc(branchDoc(id), {
      ...input,
      updatedAt: serverTimestamp(),
    });

    return id;
  }

  const ref = await addDoc(
    businessCollection("branches"),
    {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return ref.id;
}

export async function toggleBranch(
  branchId: string,
  active: boolean
) {
  await updateDoc(branchDoc(branchId), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBusiness(
  input: Partial<Omit<Business, "id">>
) {
  await updateDoc(businessDoc(), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}