import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db, BUSINESS_ID } from "../lib/firebase";
import type { Attendance } from "../types";

function attendanceRef(barberId: string, date: string) {
  return doc(
    db,
    "businesses",
    BUSINESS_ID,
    "attendance",
    `${barberId}_${date}`
  );
}

export async function getTodayAttendance(
  barberId: string,
  date: string
): Promise<Attendance | null> {
  const snap = await getDoc(attendanceRef(barberId, date));

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as Attendance;
}

export async function checkInBarber(args: {
  barberId: string;
  barberName: string;
  branchId: string;
  date: string;
  method?: Attendance["checkInMethod"];
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sesi login barber tidak ditemukan.");
  }

  const ref = attendanceRef(args.barberId, args.date);

  const existing = await getDoc(ref);

  if (existing.exists()) {
    const current = existing.data();

    if (current.status === "PRESENT") {
      throw new Error("Anda sudah check-in hari ini.");
    }
  }

  const payload: Record<string, unknown> = {
    id: ref.id,
    businessId: BUSINESS_ID,
    userId: user.uid,
    branchId: args.branchId,
    barberId: args.barberId,
    barberName: args.barberName,
    date: args.date,
    checkInAt: serverTimestamp(),
    checkInMethod: args.method ?? "MANUAL",
    status: "PRESENT",
    updatedAt: serverTimestamp(),
  };

  if (existing.exists()) {
    const existingCreatedAt = existing.data().createdAt;

    if (existingCreatedAt) {
      payload.createdAt = existingCreatedAt;
    } else {
      payload.createdAt = serverTimestamp();
    }
  } else {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload, { merge: true });

  return getTodayAttendance(args.barberId, args.date);
}

export async function checkOutBarber(
  barberId: string,
  date: string
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sesi login barber tidak ditemukan.");
  }

  const ref = attendanceRef(barberId, date);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Belum ada data check-in hari ini.");
  }

  const current = snap.data();

  if (current.userId !== user.uid) {
    throw new Error(
      "Anda tidak memiliki akses ke attendance barber ini."
    );
  }

  if (current.status !== "PRESENT") {
    throw new Error(
      "Attendance hari ini sudah ditutup."
    );
  }

  await updateDoc(ref, {
    status: "COMPLETED",
    checkOutAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return getTodayAttendance(barberId, date);
}