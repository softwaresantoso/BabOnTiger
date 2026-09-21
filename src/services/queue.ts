import { collection, doc, getDocs, limit, query, runTransaction, serverTimestamp, where, orderBy } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import { getTodayAttendance } from "./attendance";
import type { Barber, Booking, Queue, Service } from "../types";

const col = (name: string) => collection(db, "businesses", BUSINESS_ID, name);
const docRef = (name: string, id: string) => doc(db, "businesses", BUSINESS_ID, name, id);

function dateKey(date: string) { return date.replaceAll("-", ""); }
function nextQueueRef(branchId: string, date: string) { return docRef("queueCounters", `${branchId}_${date}`); }

export async function getQueueForDate(branchId: string, date: string): Promise<Queue[]> {
  const snap = await getDocs(query(col("queues"), where("branchId", "==", branchId), where("date", "==", date), orderBy("queueNumber")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Queue));
}

export async function createQueueEntry(args: {
  branchId: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  barberId?: string;
  barberName?: string;
  service: Service;
  bookingId?: string;
  source: "ONLINE" | "WALK_IN";
  initialStatus?: Queue["status"];
}) {
  const queueRef = doc(col("queues"));
  const counterRef = nextQueueRef(args.branchId, args.date);
  let queueNumber = 0;
  await runTransaction(db, async tx => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists() ? Number(counterSnap.data().nextNumber || 1) : 1;
    queueNumber = current;
    tx.set(counterRef, { businessId: BUSINESS_ID, branchId: args.branchId, date: args.date, nextNumber: current + 1, updatedAt: serverTimestamp() }, { merge: true });
    const queue: Queue = {
      id: queueRef.id, businessId: BUSINESS_ID, branchId: args.branchId, date: args.date,
      queueNumber, bookingId: args.bookingId, customerId: args.customerId, customerName: args.customerName,
      customerPhone: args.customerPhone, barberId: args.barberId, barberName: args.barberName,
      serviceId: args.service.id, serviceName: args.service.name, source: args.source,
      status: args.initialStatus ?? (args.source === "WALK_IN" ? "WAITING" : "BOOKED"),
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    tx.set(queueRef, queue);
  });
  return { id: queueRef.id, queueNumber };
}

export async function claimQueueForBarber(queueId: string, barberId: string, barberName: string) {
  await runTransaction(db, async tx => {
    const ref = docRef("queues", queueId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Antrean tidak ditemukan.");
    const queue = snap.data() as Queue;
    if (["COMPLETED", "NO_SHOW", "CANCELLED"].includes(queue.status)) {
      throw new Error("Antrean ini sudah selesai dan tidak dapat diambil.");
    }
    if (queue.barberId && queue.barberId !== barberId) {
      throw new Error("Antrean sudah ditangani barber lain.");
    }
    tx.update(ref, {
      barberId,
      barberName,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function transitionQueue(queueId: string, status: Queue["status"], extra: Record<string, unknown> = {}) {
  await runTransaction(db, async tx => {
    const ref = docRef("queues", queueId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Antrean tidak ditemukan.");
    tx.update(ref, { status, ...extra, updatedAt: serverTimestamp() });
  });
}

export async function checkInQueue(queueId: string) {
  await transitionQueue(queueId, "WAITING", { checkedInAt: serverTimestamp() });
}
export async function callQueue(queueId: string) {
  await transitionQueue(queueId, "CALLED", { calledAt: serverTimestamp() });
}
export async function startQueueService(queueId: string, barberContext?: { barberId: string; date: string }) {
  if (barberContext) {
    const attendance = await getTodayAttendance(barberContext.barberId, barberContext.date);
    if (!attendance || attendance.status !== "PRESENT") {
      throw new Error("Barber harus check-in terlebih dahulu sebelum mulai melayani.");
    }
  }
  await transitionQueue(queueId, "IN_SERVICE", { startedAt: serverTimestamp() });
}
export async function completeQueue(queueId: string) {
  await transitionQueue(queueId, "COMPLETED", { completedAt: serverTimestamp() });
}
export async function markNoShow(queueId: string) {
  await transitionQueue(queueId, "NO_SHOW", { completedAt: serverTimestamp() });
}
export async function cancelQueue(queueId: string) {
  await transitionQueue(queueId, "CANCELLED", {});
}
