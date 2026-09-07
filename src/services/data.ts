import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, limit
} from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import type { Barber, Booking, BookingStatus, Schedule, Service, SpecialSchedule, Transaction } from "../types";

const business = (name: string) => collection(db, "businesses", BUSINESS_ID, name);

export async function getActiveServices(): Promise<Service[]> {
  const snap = await getDocs(query(business("services"), where("active", "==", true), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
}
export async function getAllServices(): Promise<Service[]> {
  const snap = await getDocs(query(business("services"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
}
export async function saveService(input: Omit<Service, "id">, id?: string) {
  if (id) await updateDoc(doc(business("services"), id), input);
  else await addDoc(business("services"), input);
}
export async function toggleService(id: string, active: boolean) {
  await updateDoc(doc(business("services"), id), { active, updatedAt: serverTimestamp() });
}

export async function getActiveBarbers(): Promise<Barber[]> {
  const snap = await getDocs(query(business("barbers"), where("active", "==", true), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Barber));
}
export async function getAllBarbers(): Promise<Barber[]> {
  const snap = await getDocs(query(business("barbers"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Barber));
}
export async function saveBarber(input: Omit<Barber, "id">, id?: string) {
  if (id) await updateDoc(doc(business("barbers"), id), input);
  else await addDoc(business("barbers"), input);
}
export async function toggleBarber(id: string, active: boolean) {
  await updateDoc(doc(business("barbers"), id), { active, updatedAt: serverTimestamp() });
}

export async function getSchedules(barberId?: string): Promise<Schedule[]> {
  const base = business("schedules");
  const q = barberId ? query(base, where("barberId", "==", barberId), orderBy("dayOfWeek")) : query(base, orderBy("dayOfWeek"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule));
}
export async function saveSchedule(input: Omit<Schedule, "id">, id?: string) {
  if (id) await updateDoc(doc(business("schedules"), id), input);
  else await addDoc(business("schedules"), input);
}

export async function getSpecialSchedule(barberId: string, date: string): Promise<SpecialSchedule | null> {
  const snap = await getDocs(query(
    business("specialSchedules"),
    where("barberId", "==", barberId),
    where("date", "==", date),
    limit(1)
  ));
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as SpecialSchedule);
}

export async function getBookingsForDate(barberId: string, date: string): Promise<Booking[]> {
  const snap = await getDocs(query(
    business("bookings"),
    where("barberId", "==", barberId),
    where("date", "==", date),
    orderBy("startTime")
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getCustomerBookings(customerId: string): Promise<Booking[]> {
  const snap = await getDocs(query(
    business("bookings"),
    where("customerId", "==", customerId),
    orderBy("date", "desc"),
    limit(100)
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getAllBookings(): Promise<Booking[]> {
  const snap = await getDocs(query(business("bookings"), orderBy("date", "desc"), limit(500)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  await updateDoc(doc(business("bookings"), bookingId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function getCustomers() {
  const snap = await getDocs(query(collection(db, "users"), where("businessId", "==", BUSINESS_ID), where("role", "==", "customer"), orderBy("name")));
  return snap.docs.map(d => d.data());
}

export async function saveTransaction(bookingId: string, amount: number, method: Transaction["method"], status: Transaction["status"]) {
  const ref = doc(business("transactions"));
  await setDoc(ref, { bookingId, amount, method, status, paidAt: status === "PAID" ? serverTimestamp() : null });
}

export async function getBusinessSettings() {
  const snap = await getDoc(doc(db, "businesses", BUSINESS_ID));
  return snap.exists() ? snap.data() : {};
}
