import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  db,
  BUSINESS_ID,
} from "../lib/firebase";
import type {
  Branch,
  Business,
} from "../types";

export const businessDoc = () =>
  doc(
    db,
    "businesses",
    BUSINESS_ID
  );

export const businessCollection = (
  name: string
) =>
  collection(
    db,
    "businesses",
    BUSINESS_ID,
    name
  );

export const branchDoc = (
  branchId: string
) =>
  doc(
    db,
    "businesses",
    BUSINESS_ID,
    "branches",
    branchId
  );

export async function getBusiness(): Promise<Business | null> {
  const snap = await getDoc(
    businessDoc()
  );

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as Business;
}

export async function getActiveBranches(): Promise<Branch[]> {
  /*
   * Jangan gunakan:
   *
   * where("active", "==", true)
   * + orderBy("name")
   *
   * karena kombinasi tersebut dapat membutuhkan
   * composite index.
   *
   * Kita ambil cabang aktif lalu sorting di client.
   */
  const snap = await getDocs(
    query(
      businessCollection("branches"),
      where("active", "==", true)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Branch
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

export async function getAllBranches(): Promise<Branch[]> {
  /*
   * Owner dapat membaca seluruh cabang.
   * Sorting dilakukan di client agar tidak bergantung
   * pada orderBy Firestore.
   */
  const snap = await getDocs(
    businessCollection("branches")
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Branch
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

export async function createBranch(input: {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  active?: boolean;
}) {
  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "Nama cabang wajib diisi."
    );
  }

  const ref = await addDoc(
    businessCollection("branches"),
    {
      businessId: BUSINESS_ID,
      name,
      ...(input.code?.trim()
        ? {
            code: input.code
              .trim()
              .toUpperCase(),
          }
        : {}),
      ...(input.address?.trim()
        ? {
            address:
              input.address.trim(),
          }
        : {}),
      ...(input.phone?.trim()
        ? {
            phone:
              input.phone.trim(),
          }
        : {}),
      active:
        input.active ?? true,
      queueSettings: {
        resetDaily: true,
        prefix: "Q",
      },
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    }
  );

  return ref.id;
}

export async function updateBranch(
  branchId: string,
  input: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    active: boolean;
  }
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "Nama cabang wajib diisi."
    );
  }

  await updateDoc(
    branchDoc(branchId),
    {
      name,
      code:
        input.code?.trim()
          ? input.code
              .trim()
              .toUpperCase()
          : "",
      address:
        input.address?.trim() || "",
      phone:
        input.phone?.trim() || "",
      active: input.active,
      updatedAt:
        serverTimestamp(),
    }
  );
}

export async function deleteBranch(
  branchId: string
) {
  if (!branchId) {
    throw new Error(
      "ID cabang tidak valid."
    );
  }

  await deleteDoc(
    branchDoc(branchId)
  );
}

export async function getBranch(
  branchId: string
): Promise<Branch | null> {
  if (!branchId) {
    return null;
  }

  const snap = await getDoc(
    branchDoc(branchId)
  );

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as Branch;
}

export async function updateBusiness(
  input: Partial<
    Omit<Business, "id">
  >
) {
  await updateDoc(
    businessDoc(),
    {
      ...input,
      updatedAt:
        serverTimestamp(),
    }
  );
}