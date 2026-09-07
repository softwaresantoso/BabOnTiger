import {
  collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where
} from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import { getSchedules, getSpecialSchedule } from "./data";
import type { Booking, Barber, Schedule, Service } from "../types";

const SLOT = 15;

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
function dayOfWeek(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
function lockId(barberId: string, date: string, time: string) {
  return `${date}_${barberId}_${time.replace(":", "")}`;
}
function lockRef(barberId: string, date: string, time: string) {
  return doc(db, "businesses", BUSINESS_ID, "bookingLocks", lockId(barberId, date, time));
}

export function endTime(startTime: string, durationMinutes: number) {
  return fromMinutes(toMinutes(startTime) + durationMinutes);
}

export async function getAvailableSlots(
  barber: Barber,
  service: Service,
  date: string
): Promise<string[]> {
  const weekly = (await getSchedules(barber.id)).filter(s => s.active && s.dayOfWeek === dayOfWeek(date));
  const special = await getSpecialSchedule(barber.id, date);

  let start: number | null = null;
  let end: number | null = null;
  let breakStart: number | null = null;
  let breakEnd: number | null = null;

  if (special) {
    if (special.type === "CLOSED") return [];
    start = special.startTime ? toMinutes(special.startTime) : null;
    end = special.endTime ? toMinutes(special.endTime) : null;
    breakStart = special.breakStart ? toMinutes(special.breakStart) : null;
    breakEnd = special.breakEnd ? toMinutes(special.breakEnd) : null;
  } else if (weekly[0]) {
    start = toMinutes(weekly[0].startTime);
    end = toMinutes(weekly[0].endTime);
    breakStart = weekly[0].breakStart ? toMinutes(weekly[0].breakStart) : null;
    breakEnd = weekly[0].breakEnd ? toMinutes(weekly[0].breakEnd) : null;
  } else {
    return [];
  }

  const locks = await getDocs(query(
    collection(db, "businesses", BUSINESS_ID, "bookingLocks"),
    where("barberId", "==", barber.id),
    where("date", "==", date)
  ));
  const occupied = new Set(locks.docs.map(d => d.data().slotTime as string));

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30;

  const result: string[] = [];
  for (let t = start; t + service.durationMinutes <= (end ?? 0); t += SLOT) {
    const candidateEnd = t + service.durationMinutes;
    const inBreak = breakStart !== null && breakEnd !== null && t < breakEnd && candidateEnd > breakStart;
    if (inBreak) continue;
    if (date === today && t < currentMinutes) continue;

    let free = true;
    for (let s = t; s < candidateEnd; s += SLOT) {
      if (occupied.has(fromMinutes(s))) {
        free = false;
        break;
      }
    }
    if (free) result.push(fromMinutes(t));
  }
  return result;
}

export async function createBooking(args: {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  barber: Barber;
  service: Service;
  date: string;
  startTime: string;
  notes?: string;
}) {
  const bookingRef = doc(collection(db, "businesses", BUSINESS_ID, "bookings"));
  const end = endTime(args.startTime, args.service.durationMinutes);
  const code = `BT-${args.date.replaceAll("-", "")}-${args.startTime.replace(":", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await runTransaction(db, async (tx) => {
    const slotTimes: string[] = [];
    for (let s = toMinutes(args.startTime); s < toMinutes(end); s += SLOT) {
      slotTimes.push(fromMinutes(s));
    }

    const lockRefs = slotTimes.map((time) => lockRef(args.barber.id, args.date, time));
    const lockSnaps = [];
    for (const ref of lockRefs) lockSnaps.push(await tx.get(ref));
    if (lockSnaps.some(s => s.exists())) {
      throw new Error("Slot baru saja diambil pelanggan lain. Silakan pilih waktu lain.");
    }

    const booking: Booking = {
      id: bookingRef.id,
      code,
      businessId: BUSINESS_ID,
      customerId: args.customerId,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      barberId: args.barber.id,
      barberName: args.barber.name,
      serviceId: args.service.id,
      serviceName: args.service.name,
      durationMinutes: args.service.durationMinutes,
      price: args.service.price,
      date: args.date,
      startTime: args.startTime,
      endTime: end,
      status: "PENDING",
      notes: args.notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    tx.set(bookingRef, booking);
    slotTimes.forEach((slotTime) => {
      tx.set(lockRef(args.barber.id, args.date, slotTime), {
        businessId: BUSINESS_ID,
        barberId: args.barber.id,
        date: args.date,
        slotTime,
        bookingId: bookingRef.id,
        ownerUid: args.customerId,
        createdAt: serverTimestamp()
      });
    });
  });

  return { id: bookingRef.id, code };
}

export async function cancelBooking(booking: Booking, actorUid: string) {
  if (booking.customerId !== actorUid) throw new Error("Anda tidak memiliki akses ke booking ini.");
  if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status)) {
    throw new Error("Booking ini sudah tidak dapat dibatalkan.");
  }

  await runTransaction(db, async (tx) => {
    const bookingRef = doc(db, "businesses", BUSINESS_ID, "bookings", booking.id);
    const current = await tx.get(bookingRef);
    if (!current.exists()) throw new Error("Booking tidak ditemukan.");

    for (let s = toMinutes(booking.startTime); s < toMinutes(booking.endTime); s += SLOT) {
      tx.delete(lockRef(booking.barberId, booking.date, fromMinutes(s)));
    }
    tx.update(bookingRef, { status: "CANCELLED", updatedAt: serverTimestamp() });
  });
}
