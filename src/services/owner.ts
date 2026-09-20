import { getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { businessCollection } from "./business";
import type { Booking, Queue } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

export interface OwnerDailyMetrics {
  bookings: number;
  waiting: number;
  inService: number;
  completed: number;
  noShow: number;
  cancelled: number;
}

export async function getOwnerDailyData(branchId: string, date = today()) {
  const [bookingSnap, queueSnap] = await Promise.all([
    getDocs(query(businessCollection("bookings"), where("branchId", "==", branchId), where("date", "==", date), orderBy("startTime"))),
    getDocs(query(businessCollection("queues"), where("branchId", "==", branchId), where("date", "==", date), orderBy("queueNumber"), limit(200)))
  ]);

  const bookings = bookingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
  const queues = queueSnap.docs.map(d => ({ id: d.id, ...d.data() } as Queue));
  const metrics: OwnerDailyMetrics = {
    bookings: bookings.length,
    waiting: queues.filter(q => q.status === "WAITING" || q.status === "BOOKED").length,
    inService: queues.filter(q => q.status === "IN_SERVICE").length,
    completed: queues.filter(q => q.status === "COMPLETED").length,
    noShow: queues.filter(q => q.status === "NO_SHOW").length,
    cancelled: queues.filter(q => q.status === "CANCELLED").length,
  };
  return { bookings, queues, metrics };
}
