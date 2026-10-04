import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import type { Attendance } from "../types";

function attendanceRef(barberId: string, date: string) {
  return doc(db, "businesses", BUSINESS_ID, "attendance", `${barberId}_${date}`);
}

export async function getTodayAttendance(barberId: string, date: string): Promise<Attendance | null> {
  const snap = await getDoc(attendanceRef(barberId, date));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Attendance) : null;
}

export async function checkInBarber(args: {
  barberId: string;
  barberName: string;
  branchId: string;
  date: string;
  method?: Attendance["checkInMethod"];
}) {
  const ref = attendanceRef(args.barberId, args.date);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().status === "PRESENT") {
      throw new Error("Anda sudah check-in hari ini.");
    }
    tx.set(ref, {
      id: ref.id,
      businessId: BUSINESS_ID,
      branchId: args.branchId,
      barberId: args.barberId,
      barberName: args.barberName,
      date: args.date,
      checkInAt: serverTimestamp(),
      checkInMethod: args.method ?? "MANUAL",
      status: "PRESENT",
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  return getTodayAttendance(args.barberId, args.date);
}

export async function checkOutBarber(barberId: string, date: string) {
  const ref = attendanceRef(barberId, date);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Belum ada data check-in hari ini.");
    if (snap.data().status !== "PRESENT") throw new Error("Attendance hari ini sudah ditutup.");
    tx.update(ref, { status: "COMPLETED", checkOutAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  return getTodayAttendance(barberId, date);
}
