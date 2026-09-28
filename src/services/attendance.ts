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

/**
 * Ambil attendance hari ini.
 *
 * Jika dokumen belum ada atau dokumen lama tidak dapat dibaca
 * karena struktur Rules lama, kembalikan null agar halaman
 * Barber tetap dapat digunakan.
 */
export async function getTodayAttendance(
  barberId: string,
  date: string
): Promise<Attendance | null> {
  if (!barberId) {
    return null;
  }

  try {
    const ref = attendanceRef(barberId, date);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as Attendance;
  } catch {
    // Jangan membuat dashboard/check-in gagal hanya karena
    // attendance lama belum memiliki field userId.
    return null;
  }
}

/**
 * Barber check-in.
 *
 * Sengaja TIDAK menggunakan transaction + tx.get().
 * Untuk check-in pertama, dokumen attendance belum ada.
 */
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

  if (!user.uid) {
    throw new Error("UID akun barber tidak ditemukan.");
  }

  if (!args.barberId) {
    throw new Error("Profil barber tidak ditemukan.");
  }

  if (!args.branchId) {
    throw new Error("Cabang barber tidak ditemukan.");
  }

  const ref = attendanceRef(args.barberId, args.date);

  /*
   * Jangan membaca dokumen terlebih dahulu.
   *
   * setDoc() langsung:
   * - akan menjadi CREATE jika belum ada
   * - akan menjadi UPDATE/MERGE jika sudah ada
   *
   * Rules akan memastikan barber hanya dapat menulis
   * attendance miliknya sendiri.
   */
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

  /*
   * Untuk dokumen baru, createdAt dibuat.
   *
   * Kita tidak perlu membaca dokumen lama.
   * Jika dokumen lama sudah ada, merge akan mempertahankan
   * createdAt lama karena field ini tidak dikirim pada update.
   */
  payload.createdAt = serverTimestamp();

  await setDoc(ref, payload, {
    merge: true,
  });

  /*
   * Tidak melakukan getDoc() lagi.
   * Kita sudah mengetahui state attendance yang baru.
   */
  return {
    id: ref.id,
    ...payload,
  } as Attendance;
}

/**
 * Barber check-out.
 */
export async function checkOutBarber(
  barberId: string,
  date: string
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Sesi login barber tidak ditemukan.");
  }

  if (!user.uid) {
    throw new Error("UID akun barber tidak ditemukan.");
  }

  if (!barberId) {
    throw new Error("Profil barber tidak ditemukan.");
  }

  const ref = attendanceRef(barberId, date);

  /*
   * Untuk checkout kita memang perlu membaca dokumen.
   * Rules baru mengizinkan barber membaca attendance
   * berdasarkan barberId yang terhubung ke akun mereka.
   */
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "Belum ada data check-in hari ini."
    );
  }

  const current = snap.data();

  if (current.barberId !== barberId) {
    throw new Error(
      "Attendance bukan milik barber yang sedang login."
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
    userId: user.uid,
  });

  return {
    id: snap.id,
    ...current,
    status: "COMPLETED",
  } as Attendance;
}