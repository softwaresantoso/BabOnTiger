import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import type { Branch, Business } from "../types";

export async function getBusiness(): Promise<Business | null> {
  const snap = await getDoc(doc(db, "businesses", BUSINESS_ID));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Business) : null;
}

export async function getActiveBranches(): Promise<Branch[]> {
  const ref = collection(db, "businesses", BUSINESS_ID, "branches");
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)).filter(branch => branch.active).sort((a, b) => a.name.localeCompare(b.name));
}
