import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { businessCollection } from "./business";
import type { Barber, BarberRequest } from "../types";

const barberRequestsCollection = collection(
  db,
  "barberRequests"
);

export async function getPendingBarberRequests(
  businessId: string
): Promise<BarberRequest[]> {
  const snap = await getDocs(
    query(
      barberRequestsCollection,
      where("businessId", "==", businessId)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          uid: item.id,
          ...item.data(),
        }) as BarberRequest
    )
    .filter(
      (item) => item.status === "PENDING"
    )
    .sort((a, b) => {
      const aTime =
        a.createdAt &&
        typeof a.createdAt === "object" &&
        "seconds" in a.createdAt
          ? Number(
              (a.createdAt as { seconds: number }).seconds
            )
          : 0;

      const bTime =
        b.createdAt &&
        typeof b.createdAt === "object" &&
        "seconds" in b.createdAt
          ? Number(
              (b.createdAt as { seconds: number }).seconds
            )
          : 0;

      return bTime - aTime;
    });
}

export async function approveBarberRequest(
  request: BarberRequest,
  barber: Barber,
  branchId: string
) {
  if (!request.uid) {
    throw new Error("UID barber tidak valid.");
  }

  if (!barber.id) {
    throw new Error("Profil barber tidak valid.");
  }

  if (!branchId) {
    throw new Error("Cabang wajib dipilih.");
  }

  const batch = writeBatch(db);

  const userRef = doc(
    db,
    "users",
    request.uid
  );

  const barberRef = doc(
    businessCollection("barbers"),
    barber.id
  );

  const requestRef = doc(
    db,
    "barberRequests",
    request.uid
  );

  batch.set(
    userRef,
    {
      uid: request.uid,
      businessId: request.businessId,
      name: request.name,
      phone: request.phone ?? "",
      role: "barber",
      branchId,
      barberId: barber.id,
      active: true,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  batch.update(barberRef, {
    businessId: request.businessId,
    branchId,
    userId: request.uid,
    active: true,
    updatedAt: new Date(),
  });

  batch.update(requestRef, {
    status: "APPROVED",
    updatedAt: new Date(),
  });

  await batch.commit();
}

export async function rejectBarberRequest(
  request: BarberRequest
) {
  const requestRef = doc(
    db,
    "barberRequests",
    request.uid
  );

  await updateDoc(requestRef, {
    status: "REJECTED",
    updatedAt: new Date(),
  });
}