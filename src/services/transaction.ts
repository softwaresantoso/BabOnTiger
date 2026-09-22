import { collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import { businessCollection } from "./business";
import type { Booking, Product, Transaction, TransactionItem } from "../types";

const transactions = () => businessCollection("transactions");
const products = () => businessCollection("products");

export async function getTransactions(branchId?: string, barberId?: string): Promise<Transaction[]> {
  const base = transactions();
  let q;
  if (branchId && barberId) q = query(base, where("branchId", "==", branchId), where("barberId", "==", barberId), orderBy("createdAt", "desc"));
  else if (branchId) q = query(base, where("branchId", "==", branchId), orderBy("createdAt", "desc"));
  else if (barberId) q = query(base, where("barberId", "==", barberId), orderBy("createdAt", "desc"));
  else q = query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
}

export async function getTransactionForBooking(bookingId: string): Promise<Transaction | null> {
  const snap = await getDocs(query(transactions(), where("bookingId", "==", bookingId)));
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Transaction);
}

export async function createTransaction(args: {
  branchId: string;
  booking?: Booking;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  barberId?: string;
  barberName?: string;
  items: TransactionItem[];
  discount?: number;
  method: NonNullable<Transaction["method"]>;
  status?: Transaction["status"];
  createdBy: string;
}) {
  if (!args.items.length) throw new Error("Tambahkan minimal satu item transaksi.");
  const transactionRef = doc(transactions());
  const bookingRef = args.booking ? doc(businessCollection("bookings"), args.booking.id) : null;
  const normalizedItems = args.items.map(item => ({ ...item, quantity: Number(item.quantity), subtotal: Number(item.unitPrice) * Number(item.quantity) }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const promoDiscount = Number(args.booking?.promoDiscount || 0);
  const discount = Math.max(0, Math.min(Number(args.discount || 0) + promoDiscount, subtotal));
  const total = subtotal - discount;
  const paymentStatus: Transaction["status"] = args.status ?? (args.method === "CASH" || args.method === "QRIS" || args.method === "TRANSFER" ? "PAID" : "UNPAID");

  await runTransaction(db, async tx => {
    const productRefs = normalizedItems.filter(i => i.type === "PRODUCT").map(i => ({ item: i, ref: doc(products(), i.itemId) }));
    const promoRef = args.booking?.promoId ? doc(businessCollection("promos"), args.booking.promoId) : null;
    const usageRef = args.booking?.promoId && (args.customerId ?? args.booking?.customerId) ? doc(businessCollection("promoUsages"), `${args.booking.promoId}_${args.customerId ?? args.booking?.customerId}`) : null;
    const productSnaps = [];
    for (const entry of productRefs) productSnaps.push({ ...entry, snap: await tx.get(entry.ref) });
    const promoSnap = promoRef && paymentStatus === "PAID" ? await tx.get(promoRef) : null;
    const usageSnap = usageRef && paymentStatus === "PAID" ? await tx.get(usageRef) : null;

    if (promoSnap?.exists()) {
      const promo = promoSnap.data() as { active?: boolean; usageLimit?: number; usageCount?: number; customerUsageLimit?: number };
      const usageCount = Number(promo.usageCount || 0);
      const customerUsage = usageSnap?.exists() ? Number(usageSnap.data().usageCount || 0) : 0;
      if (!promo.active) throw new Error("Promo sudah tidak aktif.");
      if (promo.usageLimit !== undefined && promo.usageLimit > 0 && usageCount >= promo.usageLimit) throw new Error("Kuota promo sudah habis.");
      if (promo.customerUsageLimit !== undefined && promo.customerUsageLimit > 0 && customerUsage >= promo.customerUsageLimit) throw new Error("Batas penggunaan promo untuk customer ini sudah tercapai.");
    }

    if (args.booking && bookingRef) {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) throw new Error("Booking tidak ditemukan.");
      const existing = bookingSnap.data() as Booking;
      if (existing.businessId !== BUSINESS_ID || existing.branchId !== args.branchId) throw new Error("Booking bukan milik cabang ini.");
    }

    for (const entry of productSnaps) {
      if (!entry.snap.exists()) throw new Error(`Produk ${entry.item.name} tidak ditemukan.`);
      const product = entry.snap.data() as Product;
      const qty = entry.item.quantity;
      if (product.stock < qty) throw new Error(`Stok ${product.name} tidak mencukupi.`);
      tx.update(entry.ref, { stock: product.stock - qty, updatedAt: serverTimestamp() });
    }

    for (const entry of productSnaps) {
      const product = entry.snap.data() as Product;
      const qty = entry.item.quantity;
      const movementRef = doc(businessCollection("stockMovements"));
      tx.set(movementRef, {
        businessId: BUSINESS_ID,
        branchId: args.branchId,
        productId: product.id,
        productName: product.name,
        type: "SALE",
        quantity: qty,
        previousStock: product.stock,
        newStock: product.stock - qty,
        referenceId: transactionRef.id,
        referenceType: "TRANSACTION",
        createdBy: args.createdBy,
        createdAt: serverTimestamp(),
      });
    }

    const transaction: Omit<Transaction, "id"> = {
      businessId: BUSINESS_ID,
      branchId: args.branchId,
      bookingId: args.booking?.id,
      queueId: undefined,
      customerId: args.customerId ?? args.booking?.customerId,
      customerName: args.customerName ?? args.booking?.customerName,
      customerPhone: args.customerPhone ?? args.booking?.customerPhone,
      createdBy: args.createdBy,
      barberId: args.barberId ?? args.booking?.barberId,
      barberName: args.barberName ?? args.booking?.barberName,
      items: normalizedItems,
      subtotal,
      discount,
      total,
      promoId: args.booking?.promoId,
      promoCode: args.booking?.promoCode,
      method: args.method,
      paymentMethod: args.method,
      status: paymentStatus,
      paymentStatus,
      paidAt: paymentStatus === "PAID" ? serverTimestamp() : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    tx.set(transactionRef, transaction);

    if (promoRef && usageRef && paymentStatus === "PAID") {
      const currentUsage = usageSnap?.exists() ? Number(usageSnap.data().usageCount || 0) : 0;
      tx.set(usageRef, { businessId: BUSINESS_ID, branchId: args.branchId, promoId: args.booking?.promoId, customerId: args.customerId ?? args.booking?.customerId, usageCount: currentUsage + 1, lastUsedAt: serverTimestamp(), lastTransactionId: transactionRef.id }, { merge: true });
      const promoData = promoSnap?.data();

tx.update(promoRef, {
  usageCount: Number(promoData?.usageCount || 0) + 1,
  updatedAt: serverTimestamp()
});
}

    if (args.booking && bookingRef && paymentStatus === "PAID") {
      tx.update(bookingRef, { status: "COMPLETED", updatedAt: serverTimestamp() });
    }
  });
  return transactionRef.id;
}

export async function markTransactionPaid(transactionId: string, method: NonNullable<Transaction["method"]>) {
  await runTransaction(db, async tx => {
    const ref = doc(transactions(), transactionId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Transaksi tidak ditemukan.");
    const current = { id: snap.id, ...snap.data() } as Transaction;
    if (current.status === "PAID") return;
    const promoRef = current.promoId ? doc(businessCollection("promos"), current.promoId) : null;
    const usageRef = current.promoId && current.customerId ? doc(businessCollection("promoUsages"), `${current.promoId}_${current.customerId}`) : null;
    const promoSnap = promoRef ? await tx.get(promoRef) : null;
    const usageSnap = usageRef ? await tx.get(usageRef) : null;
    if (promoSnap?.exists()) {
      const promo = promoSnap.data() as { active?: boolean; usageLimit?: number; usageCount?: number; customerUsageLimit?: number };
      const usageCount = Number(promo.usageCount || 0);
      const customerUsage = usageSnap?.exists() ? Number(usageSnap.data().usageCount || 0) : 0;
      if (!promo.active) throw new Error("Promo sudah tidak aktif.");
      if (promo.usageLimit !== undefined && promo.usageLimit > 0 && usageCount >= promo.usageLimit) throw new Error("Kuota promo sudah habis.");
      if (promo.customerUsageLimit !== undefined && promo.customerUsageLimit > 0 && customerUsage >= promo.customerUsageLimit) throw new Error("Batas penggunaan promo untuk customer ini sudah tercapai.");
      if (promoRef && usageRef) {
        tx.set(usageRef, { businessId: BUSINESS_ID, promoId: current.promoId, customerId: current.customerId, usageCount: customerUsage + 1, lastUsedAt: serverTimestamp(), lastTransactionId: transactionId }, { merge: true });
        tx.update(promoRef, { usageCount: usageCount + 1, updatedAt: serverTimestamp() });
      }
    }
    tx.update(ref, { method, paymentMethod: method, status: "PAID", paymentStatus: "PAID", paidAt: serverTimestamp(), promoConsumedAt: current.promoId ? serverTimestamp() : undefined, updatedAt: serverTimestamp() });
  });
}
