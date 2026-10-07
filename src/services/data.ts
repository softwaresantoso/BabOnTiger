import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, BUSINESS_ID } from "../lib/firebase";
import { businessCollection } from "./business";

import type {
  Barber,
  Booking,
  BookingStatus,
  Schedule,
  Service,
  SpecialSchedule,
  Transaction,
} from "../types";

const business = (name: string) => businessCollection(name);

/* =========================================================
   HELPERS
   ========================================================= */

function cleanOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/* =========================================================
   SERVICES
   ========================================================= */

export async function getActiveServices(): Promise<Service[]> {
  const snap = await getDocs(
    query(
      business("services"),
      where("active", "==", true)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Service
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllServices(): Promise<Service[]> {
  const snap = await getDocs(business("services"));

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Service
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveService(
  input: Omit<Service, "id">,
  id?: string
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Nama layanan wajib diisi.");
  }

  const durationMinutes = Number(input.durationMinutes);
  const price = Number(input.price);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Durasi layanan harus lebih dari 0 menit.");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Harga layanan tidak valid.");
  }

  const businessId = input.businessId || BUSINESS_ID;

  const payload: Record<string, unknown> = {
    businessId,
    name,
    durationMinutes,
    price,
    active: input.active ?? true,
    updatedAt: serverTimestamp(),
  };

  const branchId = cleanOptionalString(input.branchId);
  const category = cleanOptionalString(input.category);
  const description = cleanOptionalString(input.description);
  const imageUrl = cleanOptionalString(input.imageUrl);

  if (branchId) payload.branchId = branchId;
  if (category) payload.category = category;
  if (description) payload.description = description;
  if (imageUrl) payload.imageUrl = imageUrl;

  if (input.barberIds && input.barberIds.length > 0) {
    payload.barberIds = input.barberIds;
  }

  if (id) {
    await updateDoc(
      doc(business("services"), id),
      payload
    );
  } else {
    await addDoc(
      business("services"),
      {
        ...payload,
        createdAt: serverTimestamp(),
      }
    );
  }
}

export async function deleteService(id: string) {
  if (!id) {
    throw new Error("ID layanan tidak valid.");
  }

  await deleteDoc(
    doc(business("services"), id)
  );
}

export async function toggleService(
  id: string,
  active: boolean
) {
  if (!id) {
    throw new Error("ID layanan tidak valid.");
  }

  await updateDoc(
    doc(business("services"), id),
    {
      active,
      updatedAt: serverTimestamp(),
    }
  );
}

/* =========================================================
   BARBERS
   ========================================================= */

export async function getActiveBarbers(): Promise<Barber[]> {
  const snap = await getDocs(
    query(
      business("barbers"),
      where("active", "==", true)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Barber
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllBarbers(): Promise<Barber[]> {
  const snap = await getDocs(business("barbers"));

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Barber
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveBarber(
  input: Omit<Barber, "id">,
  id?: string
) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Nama barber wajib diisi.");
  }

  const businessId = input.businessId || BUSINESS_ID;

  const payload: Record<string, unknown> = {
    businessId,
    name,
    active: input.active ?? true,
    updatedAt: serverTimestamp(),
  };

  const branchId = cleanOptionalString(input.branchId);
  const userId = cleanOptionalString(input.userId);
  const phone = cleanOptionalString(input.phone);
  const bio = cleanOptionalString(input.bio);
  const photoUrl = cleanOptionalString(input.photoUrl);

  if (branchId) payload.branchId = branchId;
  if (userId) payload.userId = userId;
  if (phone) payload.phone = phone;
  if (bio) payload.bio = bio;
  if (photoUrl) payload.photoUrl = photoUrl;

  if (input.specialties && input.specialties.length > 0) {
    payload.specialties = input.specialties;
  }

  if (id) {
    await updateDoc(
      doc(business("barbers"), id),
      payload
    );
  } else {
    await addDoc(
      business("barbers"),
      {
        ...payload,
        createdAt: serverTimestamp(),
      }
    );
  }
}

export async function deleteBarber(id: string) {
  if (!id) {
    throw new Error("ID barber tidak valid.");
  }

  await deleteDoc(
    doc(business("barbers"), id)
  );
}

export async function toggleBarber(
  id: string,
  active: boolean
) {
  if (!id) {
    throw new Error("ID barber tidak valid.");
  }

  await updateDoc(
    doc(business("barbers"), id),
    {
      active,
      updatedAt: serverTimestamp(),
    }
  );
}

/* =========================================================
   SCHEDULES
   ========================================================= */

export async function getSchedules(
  barberId?: string
): Promise<Schedule[]> {
  const base = business("schedules");

  const q = barberId
    ? query(
        base,
        where("barberId", "==", barberId)
      )
    : query(base);

  const snap = await getDocs(q);

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Schedule
    )
    .sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek ||
        a.startTime.localeCompare(b.startTime)
    );
}

export async function saveSchedule(
  input: Omit<Schedule, "id">,
  id?: string
) {
  if (!input.barberId) {
    throw new Error("Barber wajib dipilih.");
  }

  if (!input.startTime || !input.endTime) {
    throw new Error(
      "Jam mulai dan jam selesai wajib diisi."
    );
  }

  if (id) {
    await updateDoc(
      doc(business("schedules"), id),
      {
        ...input,
        updatedAt: serverTimestamp(),
      }
    );
  } else {
    await addDoc(
      business("schedules"),
      {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
  }
}

/* =========================================================
   SPECIAL SCHEDULE
   ========================================================= */

export async function getSpecialSchedule(
  barberId: string,
  date: string
): Promise<SpecialSchedule | null> {
  const snap = await getDocs(
    query(
      business("specialSchedules"),
      where("barberId", "==", barberId),
      where("date", "==", date),
      limit(1)
    )
  );

  if (snap.empty) {
    return null;
  }

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  } as SpecialSchedule;
}

/* =========================================================
   BOOKINGS
   ========================================================= */

export async function getBookingsForDate(
  barberId: string,
  date: string
): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      business("bookings"),
      where("barberId", "==", barberId),
      where("date", "==", date)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Booking
    )
    .sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
}

export async function getCustomerBookings(
  customerId: string
): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      business("bookings"),
      where("customerId", "==", customerId),
      limit(100)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Booking
    )
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.startTime.localeCompare(a.startTime);
    });
}

export async function getAllBookings(): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      business("bookings"),
      limit(500)
    )
  );

  return snap.docs
    .map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Booking
    )
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return b.startTime.localeCompare(a.startTime);
    });
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
) {
  if (!bookingId) {
    throw new Error("ID booking tidak valid.");
  }

  await updateDoc(
    doc(business("bookings"), bookingId),
    {
      status,
      updatedAt: serverTimestamp(),
    }
  );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */

type CustomerRecord = {
  id: string;
  name?: string;
  [key: string]: unknown;
};

export async function getCustomers(): Promise<
  CustomerRecord[]
> {
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("businessId", "==", BUSINESS_ID),
      where("role", "==", "customer")
    )
  );

  const customers: CustomerRecord[] =
    snap.docs.map((item) => {
      const data = item.data();

      return {
        ...data,
        id: item.id,
        name:
          typeof data.name === "string"
            ? data.name
            : undefined,
      };
    });

  return customers.sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "")
  );
}

/* =========================================================
   LEGACY TRANSACTION HELPER
   ========================================================= */

export async function saveTransaction(
  bookingId: string,
  amount: number,
  method: Transaction["method"],
  status: Transaction["status"]
) {
  if (!bookingId) {
    throw new Error("Booking ID wajib diisi.");
  }

  const ref = doc(
    business("transactions")
  );

  await setDoc(ref, {
    bookingId,
    amount,
    method,
    status,
    paidAt:
      status === "PAID"
        ? serverTimestamp()
        : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* =========================================================
   BUSINESS SETTINGS
   ========================================================= */

export async function getBusinessSettings() {
  const snap = await getDoc(
    doc(
      db,
      "businesses",
      BUSINESS_ID
    )
  );

  return snap.exists()
    ? snap.data()
    : {};
}