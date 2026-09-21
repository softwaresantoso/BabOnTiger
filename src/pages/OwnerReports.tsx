import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Empty, ErrorBox, Loading } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { getReportData, type ReportData } from "../services/reports";
import { exportReportToExcel } from "../lib/excel";

const money = (value:number) => new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR", maximumFractionDigits:0 }).format(value || 0);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Jakarta", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
const firstOfMonth = () => `${today().slice(0,7)}-01`;

export default function OwnerReports() {
  const { business, branches } = useBusiness();
  const [startDate,setStartDate]=useState(firstOfMonth());
  const [endDate,setEndDate]=useState(today());
  const [branchId,setBranchId]=useState("");
  const [data,setData]=useState<ReportData|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function load(){
    if(!startDate || !endDate || startDate>endDate){ setError("Rentang tanggal tidak valid."); return; }
    setLoading(true); setError("");
    try { setData(await getReportData({startDate,endDate,branchId:branchId||undefined}, business.timezone || "Asia/Jakarta")); }
    catch(e){ setError(e instanceof Error ? e.message : "Gagal memuat laporan."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const title = useMemo(()=>branchId ? branches.find(b=>b.id===branchId)?.name || "Cabang" : "Semua Cabang",[branchId,branches]);

  function exportExcel(){
    if(!data) return;
    exportReportToExcel(data, `barber-online-report-${startDate}-${endDate}${branchId?`-${branchId}`:""}.xlsx`);
  }

  if(loading && !data) return <Loading/>;
  return <div>
    <div className="section-head"><div><div className="eyebrow">REPORTS</div><h1>Laporan & Excel</h1><p className="muted">Analisis transaksi, pendapatan, performa barber/cabang, produk dan stok.</p></div><div className="row-actions"><button className="btn secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button><button className="btn primary" onClick={exportExcel} disabled={!data}><FileSpreadsheet size={16}/> Export Excel</button></div></div>
    {error&&<ErrorBox message={error}/>} 
    <section className="panel report-filter"><div className="form-grid"><label>Dari<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label>Sampai<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label><label>Cabang<select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">Semua Cabang</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button className="btn primary" onClick={load} disabled={loading}>Tampilkan Laporan</button></div><small className="muted">Periode {startDate} s/d {endDate} • {title}</small></section>
    {!data ? <Empty>Pilih periode lalu tampilkan laporan.</Empty> : <>
      <div className="stats-grid report-stats">
        <Stat label="Pendapatan" value={money(data.summary.revenue)}/><Stat label="Transaksi Lunas" value={String(data.summary.paidTransactionCount)}/><Stat label="Rata-rata Transaksi" value={money(data.summary.averageTicket)}/><Stat label="Layanan Terjual" value={String(data.summary.servicesSold)}/><Stat label="Produk Terjual" value={String(data.summary.productsSold)}/><Stat label="Stok Rendah" value={String(data.summary.lowStockProducts)}/>
      </div>
      <section className="panel"><div className="panel-title"><div><div className="eyebrow">BARBER PERFORMANCE</div><h2>Performa Barber</h2></div></div>{data.barbers.length===0?<Empty>Belum ada data barber pada periode ini.</Empty>:<div className="table report-table"><div className="table-row table-head"><b>Barber</b><b>Cabang</b><b>Transaksi</b><b>Pendapatan</b><b>Layanan</b><b>Attendance</b></div>{data.barbers.map(row=><div className="table-row" key={row.barberId}><div><b>{row.barberName}</b></div><div>{row.branchName}</div><div>{row.paidTransactions}/{row.transactions}</div><div><b>{money(row.revenue)}</b><small>Avg {money(row.averageTicket)}</small></div><div>{row.servicesSold}</div><div>{row.attendanceDays} hari</div></div>)}</div>}</section>
      <section className="panel"><div className="panel-title"><div><div className="eyebrow">BRANCH PERFORMANCE</div><h2>Performa Cabang</h2></div></div>{data.branches.length===0?<Empty>Belum ada data cabang pada periode ini.</Empty>:<div className="table report-table"><div className="table-row table-head"><b>Cabang</b><b>Transaksi</b><b>Pendapatan</b><b>Layanan</b><b>Produk</b><b>Avg Ticket</b></div>{data.branches.map(row=><div className="table-row" key={row.branchId}><div><b>{row.branchName}</b></div><div>{row.paidTransactions}/{row.transactions}</div><div><b>{money(row.revenue)}</b></div><div>{row.servicesSold}</div><div>{row.productsSold}</div><div>{money(row.averageTicket)}</div></div>)}</div>}</section>
      <section className="panel"><div className="panel-title"><div><div className="eyebrow">PRODUCT & STOCK</div><h2>Produk & Stok</h2></div></div>{data.products.length===0?<Empty>Belum ada produk.</Empty>:<div className="table report-table"><div className="table-row table-head"><b>Produk</b><b>Cabang</b><b>Stok</b><b>Minimum</b><b>Harga Jual</b><b>Nilai Modal</b></div>{data.products.map(row=><div className="table-row" key={`${row.branchId}-${row.productId}`}><div><b>{row.productName}</b><small>{row.sku||"Tanpa SKU"}</small></div><div>{row.branchName}</div><div className={row.lowStock?"stock-low":""}><b>{row.stock}</b></div><div>{row.minimumStock}</div><div>{money(row.sellingPrice)}</div><div>{money(row.stockValue)}</div></div>)}</div>}</section>
      <section className="panel"><div className="panel-title"><div><div className="eyebrow">TRANSACTION SUMMARY</div><h2>Ringkasan Transaksi</h2></div></div><div className="table report-table"><div className="table-row"><span>Total transaksi</span><b>{data.summary.transactionCount}</b></div><div className="table-row"><span>Lunas</span><b>{data.summary.paidTransactionCount}</b></div><div className="table-row"><span>Belum lunas</span><b>{data.summary.unpaidTransactionCount}</b></div><div className="table-row"><span>Refund</span><b>{data.summary.refundedTransactionCount}</b></div><div className="table-row"><span>Subtotal</span><b>{money(data.summary.subtotal)}</b></div><div className="table-row"><span>Diskon</span><b>{money(data.summary.discount)}</b></div></div></section>
    </>}
  </div>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>}
