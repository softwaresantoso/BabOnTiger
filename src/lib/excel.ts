import * as XLSX from "xlsx";
import type { ReportData } from "../services/reports";
import type { Transaction } from "../types";

const money = (value: number) => Number(value || 0);

function transactionRows(transactions: Transaction[]) {
  return transactions.map(t => ({
    ID: t.id,
    Booking: t.bookingId ?? "",
    Cabang: t.branchId ?? "",
    Customer: t.customerName ?? "Walk-in",
    Barber: t.barberName ?? "-",
    Status: t.status,
    Pembayaran: t.method ?? t.paymentMethod ?? "-",
    Subtotal: money(t.subtotal ?? 0),
    Diskon: money(t.discount ?? 0),
    Total: money(t.total),
    Promo: t.promoCode ?? "",
    Dibuat: t.createdAt ? String(t.createdAt) : "",
    Dibayar: t.paidAt ? String(t.paidAt) : "",
  }));
}

export function exportReportToExcel(data: ReportData, fileName: string) {
  const workbook = XLSX.utils.book_new();
  const summaryRows = [
    ["METRIK", "NILAI"],
    ["Jumlah transaksi", data.summary.transactionCount],
    ["Transaksi lunas", data.summary.paidTransactionCount],
    ["Transaksi belum lunas", data.summary.unpaidTransactionCount],
    ["Transaksi refund", data.summary.refundedTransactionCount],
    ["Pendapatan", data.summary.revenue],
    ["Subtotal", data.summary.subtotal],
    ["Diskon", data.summary.discount],
    ["Rata-rata transaksi", data.summary.averageTicket],
    ["Layanan terjual", data.summary.servicesSold],
    ["Produk terjual", data.summary.productsSold],
    ["Produk stok rendah", data.summary.lowStockProducts],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Ringkasan");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows(data.transactions)), "Transaksi");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.barbers), "Performa Barber");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.branches), "Performa Cabang");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.products), "Produk & Stok");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.stockMovements), "Pergerakan Stok");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.attendance), "Attendance");
  XLSX.writeFile(workbook, fileName);
}
