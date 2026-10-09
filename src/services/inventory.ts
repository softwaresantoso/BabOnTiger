import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, BUSINESS_ID } from "../lib/firebase";
import { businessCollection } from "./business";

import type { Product, StockMovement } from "../types";

const products = () => businessCollection("products");
const stockMovements = () => businessCollection("stockMovements");

function removeUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export async function getProducts(
  branchId?: string,
  activeOnly = false
): Promise<Product[]> {
  const base = products();

  const constraints = branchId
    ? activeOnly
      ? [
          where("branchId", "==", branchId),
          where("active", "==", true),
          orderBy("name"),
        ]
      : [where("branchId", "==", branchId), orderBy("name")]
    : activeOnly
      ? [where("active", "==", true), orderBy("name")]
      : [orderBy("name")];

  const snap = await getDocs(query(base, ...constraints));

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  } as Product));
}

export async function saveProduct(
  input: Omit<Product, "id">,
  id?: string
): Promise<void> {
  const payload = removeUndefined({
    ...input,
    businessId: BUSINESS_ID,
    name: input.name.trim(),
    sku: input.sku?.trim() || undefined,
    category: input.category?.trim() || undefined,
    description: input.description?.trim() || undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    updatedAt: serverTimestamp(),
  });

  if (!input.name.trim()) {
    throw new Error("Nama produk wajib diisi.");
  }

  if (!input.branchId) {
    throw new Error("Cabang produk wajib dipilih.");
  }

  if (
    !Number.isFinite(input.costPrice) ||
    input.costPrice < 0 ||
    !Number.isFinite(input.sellingPrice) ||
    input.sellingPrice < 0
  ) {
    throw new Error("Harga modal dan harga jual harus berupa angka minimal 0.");
  }

  if (
    !Number.isInteger(input.stock) ||
    input.stock < 0 ||
    !Number.isInteger(input.minimumStock) ||
    input.minimumStock < 0
  ) {
    throw new Error("Stok dan minimum stok harus berupa bilangan bulat minimal 0.");
  }

  if (id) {
    await updateDoc(doc(products(), id), payload);
    return;
  }

  await addDoc(products(), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function toggleProduct(
  id: string,
  active: boolean
): Promise<void> {
  await updateDoc(doc(products(), id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function adjustStock(args: {
  productId: string;
  branchId: string;
  quantity: number;
  type: StockMovement["type"];
  note?: string;
  createdBy: string;
}): Promise<void> {
  if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
    throw new Error("Jumlah stok harus berupa bilangan bulat lebih dari 0.");
  }

  const createdBy =
  typeof args.createdBy === "string"
    ? args.createdBy.trim()
    : "";

if (!createdBy) {
  throw new Error("ID pengguna tidak tersedia. Silakan login ulang.");
}

  if (
    !["PURCHASE", "SALE", "ADJUSTMENT", "RETURN", "INITIAL"].includes(
      args.type
    )
  ) {
    throw new Error("Jenis pergerakan stok tidak valid.");
  }

  const productRef = doc(products(), args.productId);
  const movementRef = doc(stockMovements());

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(productRef);

    if (!snap.exists()) {
      throw new Error("Produk tidak ditemukan.");
    }

    const product = {
      id: snap.id,
      ...snap.data(),
    } as Product;

    if (
      product.businessId !== BUSINESS_ID ||
      product.branchId !== args.branchId
    ) {
      throw new Error("Produk bukan milik cabang ini.");
    }

    const previousStock = Number(product.stock || 0);

    const delta =
      args.type === "PURCHASE" ||
      args.type === "RETURN" ||
      args.type === "INITIAL"
        ? args.quantity
        : -args.quantity;

    const newStock = previousStock + delta;

    if (newStock < 0) {
      throw new Error("Stok tidak mencukupi.");
    }

    transaction.update(productRef, {
      stock: newStock,
      updatedAt: serverTimestamp(),
    });

    const movement = removeUndefined({
      businessId: BUSINESS_ID,
      branchId: args.branchId,
      productId: product.id,
      productName: product.name,
      type: args.type,
      quantity: args.quantity,
      previousStock,
      newStock,
      note: args.note?.trim() || undefined,
      createdBy: args.createdBy,
      createdAt: serverTimestamp(),
    });

    transaction.set(movementRef, movement);
  });
}

export async function getStockMovements(
  branchId: string,
  limitCount = 100
): Promise<StockMovement[]> {
  const snap = await getDocs(
    query(
      stockMovements(),
      where("branchId", "==", branchId),
      orderBy("createdAt", "desc")
    )
  );

  return snap.docs.slice(0, limitCount).map((item) => ({
    id: item.id,
    ...item.data(),
  } as StockMovement));
}