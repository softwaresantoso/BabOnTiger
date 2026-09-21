import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db, BUSINESS_ID, TIMEZONE } from "../lib/firebase";
import { businessCollection } from "./business";
import type { Promo } from "../types";

const promos = () => businessCollection("promos");
const usages = () => businessCollection("promoUsages");

function asMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "object" && value && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string" || typeof value === "number") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

function now() { return Date.now(); }

export async function getPromos(activeOnly = false): Promise<Promo[]> {
  const q = activeOnly
    ? query(promos(), where("active", "==", true), orderBy("title"))
    : query(promos(), orderBy("title"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Promo));
}

export async function savePromo(input: Omit<Promo, "id">, id?: string) {
  if (id) await updateDoc(doc(promos(), id), { ...input, updatedAt: serverTimestamp() });
  else await setDoc(doc(promos()), { ...input, usageCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function togglePromo(id: string, active: boolean) {
  await updateDoc(doc(promos(), id), { active, updatedAt: serverTimestamp() });
}

export async function deletePromo(id: string) {
  await import("firebase/firestore").then(({ deleteDoc }) => deleteDoc(doc(promos(), id)));
}

export interface PromoValidationContext {
  code: string;
  branchId: string;
  customerId: string;
  subtotal: number;
  serviceIds?: string[];
  productIds?: string[];
}

export interface PromoValidationResult {
  promo: Promo;
  discount: number;
}

export async function validatePromoCode(context: PromoValidationContext): Promise<PromoValidationResult> {
  const code = context.code.trim().toUpperCase();
  if (!code) throw new Error("Masukkan kode promo.");
  const snap = await getDocs(query(promos(), where("promoCode", "==", code), where("active", "==", true)));
  if (snap.empty) throw new Error("Kode promo tidak ditemukan atau sudah tidak aktif.");
  const promo = { id: snap.docs[0].id, ...snap.docs[0].data() } as Promo;
  const current = now();
  const start = asMillis(promo.startAt);
  const end = asMillis(promo.endAt);
  if (start !== null && current < start) throw new Error("Promo belum mulai berlaku.");
  if (end !== null && current > end) throw new Error("Promo sudah berakhir.");
  if (promo.branchIds?.length && !promo.branchIds.includes(context.branchId)) throw new Error("Promo tidak berlaku di cabang ini.");
  if (promo.minimumTransaction && context.subtotal < promo.minimumTransaction) throw new Error(`Minimum transaksi ${formatIDR(promo.minimumTransaction)}.`);
  if (promo.serviceIds?.length && (!context.serviceIds?.length || !context.serviceIds.some(id => promo.serviceIds!.includes(id)))) throw new Error("Promo tidak berlaku untuk layanan yang dipilih.");
  if (promo.productIds?.length && (!context.productIds?.length || !context.productIds.some(id => promo.productIds!.includes(id)))) throw new Error("Promo ini khusus produk dan tidak dapat digunakan pada booking layanan.");

  if (promo.usageLimit !== undefined && promo.usageLimit >= 0) {
    const count = Number(promo.usageCount || 0);
    if (count >= promo.usageLimit) throw new Error("Kuota promo sudah habis.");
  }

  const usageRef = doc(usages(), `${promo.id}_${context.customerId}`);
  const usageSnap = await getDoc(usageRef);
  const customerUsage = usageSnap.exists() ? Number(usageSnap.data().usageCount || 0) : 0;
  if (promo.customerUsageLimit !== undefined && customerUsage >= promo.customerUsageLimit) throw new Error("Batas penggunaan promo untuk akun ini sudah tercapai.");

  const raw = promo.discountType === "PERCENTAGE"
    ? context.subtotal * (promo.discountValue / 100)
    : promo.discountValue;
  const discount = Math.max(0, Math.min(Math.round(raw), context.subtotal));
  return { promo, discount };
}

export function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function promoIsCurrentlyActive(promo: Promo) {
  const current = now();
  const start = asMillis(promo.startAt);
  const end = asMillis(promo.endAt);
  return promo.active && (start === null || current >= start) && (end === null || current <= end);
}

export { TIMEZONE };
