import { getDocs, orderBy, query } from "firebase/firestore";
import { businessCollection, getActiveBranches } from "./business";
import { getAllBarbers } from "./data";
import { getProducts, getStockMovements } from "./inventory";
import { getTransactions } from "./transaction";
import type { Attendance, Barber, Branch, Product, StockMovement, Transaction } from "../types";

export interface ReportFilters {
  startDate: string;
  endDate: string;
  branchId?: string;
}

export interface BarberReportRow {
  barberId: string;
  barberName: string;
  branchName: string;
  transactions: number;
  paidTransactions: number;
  revenue: number;
  servicesSold: number;
  productsSold: number;
  averageTicket: number;
  attendanceDays: number;
}

export interface BranchReportRow {
  branchId: string;
  branchName: string;
  transactions: number;
  paidTransactions: number;
  revenue: number;
  servicesSold: number;
  productsSold: number;
  averageTicket: number;
}

export interface ProductReportRow {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  stock: number;
  minimumStock: number;
  sellingPrice: number;
  stockValue: number;
  lowStock: boolean;
}

export interface ReportData {
  transactions: Transaction[];
  barbers: BarberReportRow[];
  branches: BranchReportRow[];
  products: ProductReportRow[];
  stockMovements: StockMovement[];
  attendance: Attendance[];
  summary: {
    transactionCount: number;
    paidTransactionCount: number;
    unpaidTransactionCount: number;
    refundedTransactionCount: number;
    revenue: number;
    subtotal: number;
    discount: number;
    averageTicket: number;
    servicesSold: number;
    productsSold: number;
    lowStockProducts: number;
  };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: unknown, timeZone = "Asia/Jakarta") {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function inRange(value: unknown, startDate: string, endDate: string, timeZone: string) {
  const key = dateKey(value, timeZone);
  return Boolean(key && key >= startDate && key <= endDate);
}

function itemCounts(transactions: Transaction[]) {
  let servicesSold = 0;
  let productsSold = 0;
  for (const transaction of transactions) {
    for (const item of transaction.items ?? []) {
      if (item.type === "SERVICE") servicesSold += Number(item.quantity || 0);
      if (item.type === "PRODUCT") productsSold += Number(item.quantity || 0);
    }
  }
  return { servicesSold, productsSold };
}

export async function getReportData(filters: ReportFilters, timeZone = "Asia/Jakarta"): Promise<ReportData> {
  const branches = await getActiveBranches();
  const [allTransactions, allBarbers] = await Promise.all([
    getTransactions(filters.branchId || undefined),
    getAllBarbers(),
  ]);

  const transactions = allTransactions.filter(t =>
    (!filters.branchId || t.branchId === filters.branchId) &&
    inRange(t.createdAt, filters.startDate, filters.endDate, timeZone)
  );

  const branchMap = new Map(branches.map(branch => [branch.id, branch]));
  const branchIds = filters.branchId ? [filters.branchId] : branches.map(branch => branch.id);

  const [productsByBranch, movementsByBranch, attendanceSnap] = await Promise.all([
    Promise.all(branchIds.map(branchId => getProducts(branchId))),
    Promise.all(branchIds.map(branchId => getStockMovements(branchId, 500))),
    getDocs(query(businessCollection("attendance"), orderBy("date", "desc"))),
  ]);

  const products = productsByBranch.flat();
  const stockMovements = movementsByBranch.flat().filter(m => {
    // Stock movement createdAt is the authoritative event timestamp for the report.
    return inRange(m.createdAt, filters.startDate, filters.endDate, timeZone);
  });
  const attendance = attendanceSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as Attendance))
    .filter(a =>
      (!filters.branchId || a.branchId === filters.branchId) &&
      a.date >= filters.startDate && a.date <= filters.endDate
    );

  const paid = transactions.filter(t => t.status === "PAID");
  const counts = itemCounts(paid);
  const revenue = paid.reduce((sum, t) => sum + Number(t.total || 0), 0);
  const subtotal = transactions.reduce((sum, t) => sum + Number(t.subtotal || 0), 0);
  const discount = transactions.reduce((sum, t) => sum + Number(t.discount || 0), 0);

  const branchesReport: BranchReportRow[] = branches
    .filter(branch => branchIds.includes(branch.id))
    .map(branch => {
      const rows = paid.filter(t => t.branchId === branch.id);
      const branchCounts = itemCounts(rows);
      const branchRevenue = rows.reduce((sum, t) => sum + Number(t.total || 0), 0);
      return {
        branchId: branch.id,
        branchName: branch.name,
        transactions: transactions.filter(t => t.branchId === branch.id).length,
        paidTransactions: rows.length,
        revenue: branchRevenue,
        servicesSold: branchCounts.servicesSold,
        productsSold: branchCounts.productsSold,
        averageTicket: rows.length ? branchRevenue / rows.length : 0,
      };
    });

  const barbersReport: BarberReportRow[] = allBarbers
    .filter(barber => !filters.branchId || barber.branchId === filters.branchId)
    .map(barber => {
      const rows = transactions.filter(t => t.barberId === barber.id);
      const paidRows = rows.filter(t => t.status === "PAID");
      const barberCounts = itemCounts(paidRows);
      const barberRevenue = paidRows.reduce((sum, t) => sum + Number(t.total || 0), 0);
      const branchName = branchMap.get(barber.branchId ?? "")?.name ?? "-";
      return {
        barberId: barber.id,
        barberName: barber.name,
        branchName,
        transactions: rows.length,
        paidTransactions: paidRows.length,
        revenue: barberRevenue,
        servicesSold: barberCounts.servicesSold,
        productsSold: barberCounts.productsSold,
        averageTicket: paidRows.length ? barberRevenue / paidRows.length : 0,
        attendanceDays: attendance.filter(a => a.barberId === barber.id).length,
      };
    });

  const productRows: ProductReportRow[] = products.map((product: Product) => ({
    branchId: product.branchId,
    branchName: branchMap.get(product.branchId)?.name ?? "-",
    productId: product.id,
    productName: product.name,
    sku: product.sku ?? "",
    stock: Number(product.stock || 0),
    minimumStock: Number(product.minimumStock || 0),
    sellingPrice: Number(product.sellingPrice || 0),
    stockValue: Number(product.stock || 0) * Number(product.costPrice || 0),
    lowStock: Number(product.stock || 0) <= Number(product.minimumStock || 0),
  }));

  return {
    transactions,
    barbers: barbersReport,
    branches: branchesReport,
    products: productRows,
    stockMovements,
    attendance,
    summary: {
      transactionCount: transactions.length,
      paidTransactionCount: paid.length,
      unpaidTransactionCount: transactions.filter(t => t.status === "UNPAID").length,
      refundedTransactionCount: transactions.filter(t => t.status === "REFUNDED").length,
      revenue,
      subtotal,
      discount,
      averageTicket: paid.length ? revenue / paid.length : 0,
      servicesSold: counts.servicesSold,
      productsSold: counts.productsSold,
      lowStockProducts: productRows.filter(p => p.lowStock).length,
    },
  };
}
