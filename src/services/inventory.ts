import { addDoc, collection, doc, getDocs, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import { businessCollection } from "./business";
import type { Product, StockMovement } from "../types";

const products = () => businessCollection("products");
const stockMovements = () => businessCollection("stockMovements");

export async function getProducts(branchId?: string, activeOnly = false): Promise<Product[]> {
  const base = products();
  const constraints = branchId
    ? activeOnly
      ? [where("branchId", "==", branchId), where("active", "==", true), orderBy("name")]
      : [where("branchId", "==", branchId), orderBy("name")]
    : activeOnly
      ? [where("active", "==", true), orderBy("name")]
      : [orderBy("name")];
  const snap = await getDocs(query(base, ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function saveProduct(input: Omit<Product, "id">, id?: string) {
  if (id) {
    await updateDoc(doc(products(), id), { ...input, updatedAt: serverTimestamp() });
  } else {
    await addDoc(products(), { ...input, businessId: BUSINESS_ID, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export async function toggleProduct(id: string, active: boolean) {
  await updateDoc(doc(products(), id), { active, updatedAt: serverTimestamp() });
}

export async function adjustStock(args: {
  productId: string;
  branchId: string;
  quantity: number;
  type: StockMovement["type"];
  note?: string;
  createdBy: string;
}) {
  if (!Number.isInteger(args.quantity) || args.quantity <= 0) throw new Error("Jumlah stok harus berupa bilangan bulat lebih dari 0.");
  if (!["PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "INITIAL"].includes(args.type)) throw new Error("Jenis pergerakan stok tidak valid.");

  const productRef = doc(products(), args.productId);
  const movementRef = doc(stockMovements());
  await runTransaction(db, async tx => {
    const snap = await tx.get(productRef);
    if (!snap.exists()) throw new Error("Produk tidak ditemukan.");
    const product = snap.data() as Product;
    if (product.businessId !== BUSINESS_ID || product.branchId !== args.branchId) throw new Error("Produk bukan milik cabang ini.");

    const previousStock = Number(product.stock || 0);
    const delta = (args.type === "PURCHASE" || args.type === "RETURN" || args.type === "INITIAL") ? args.quantity : -args.quantity;
    const newStock = previousStock + delta;
    if (newStock < 0) throw new Error("Stok tidak mencukupi.");

    tx.update(productRef, { stock: newStock, updatedAt: serverTimestamp() });
    const movement: Omit<StockMovement, "id"> = {
      businessId: BUSINESS_ID,
      branchId: args.branchId,
      productId: product.id,
      productName: product.name,
      type: args.type,
      quantity: args.quantity,
      previousStock,
      newStock,
      note: args.note,
      createdBy: args.createdBy,
      createdAt: serverTimestamp(),
    };
    tx.set(movementRef, movement);
  });
}

export async function getStockMovements(branchId: string, limitCount = 100): Promise<StockMovement[]> {
  const snap = await getDocs(query(stockMovements(), where("branchId", "==", branchId), orderBy("createdAt", "desc")));
  return snap.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() } as StockMovement));
}
