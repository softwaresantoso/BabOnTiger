import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, MapPin, Scissors, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { cancelBooking } from "../services/booking";
import { getCustomerBookings } from "../services/data";
import type { Booking } from "../types";
import { Empty, ErrorBox, Loading } from "../components";

const ACTIVE = ["PENDING","CONFIRMED","CHECKED_IN","IN_SERVICE"];
const labels: Record<string,string> = { PENDING:"Menunggu konfirmasi", CONFIRMED:"Dikonfirmasi", CHECKED_IN:"Sudah check-in", IN_SERVICE:"Sedang dilayani", COMPLETED:"Selesai", CANCELLED:"Dibatalkan", NO_SHOW:"No-show" };

export default function CustomerDashboard() {
  const { profile } = useAuth(); const { branches } = useBusiness();
  const [items,setItems]=useState<Booking[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [tab,setTab]=useState<"upcoming"|"history">("upcoming");
  async function load(){if(!profile)return;setLoading(true);try{setItems(await getCustomerBookings(profile.uid))}catch(e){setError(e instanceof Error?e.message:"Gagal memuat booking.")}finally{setLoading(false)}}
  useEffect(()=>{load()},[profile?.uid]);
  const upcoming=useMemo(()=>items.filter(b=>ACTIVE.includes(b.status)),[items]); const history=useMemo(()=>items.filter(b=>!ACTIVE.includes(b.status)),[items]);
  if(loading)return <Loading/>;
  return <div>
    {error&&<ErrorBox message={error}/>} 
    <div className="customer-hero"><div><div className="eyebrow">CUSTOMER AREA</div><h1>Jadwal saya</h1><p className="lead">Kelola booking, lihat antrean, dan simpan profilmu dari satu tempat.</p></div><Link className="btn primary big" to="/booking">+ Booking baru</Link></div>
    <div className="customer-shortcuts"><Link to="/booking" className="shortcut"><Scissors/><b>Booking</b><span>Pilih layanan & jadwal</span></Link><Link to="/account" className="shortcut"><UserRound/><b>Profil</b><span>Data & keamanan akun</span></Link>{branches[0]&&<Link to={`/queue/${branches[0].id}`} className="shortcut"><Clock3/><b>Antrean</b><span>Lihat antrean cabang</span></Link>}</div>
    <div className="segmented wide"><button className={tab==="upcoming"?"active":""} onClick={()=>setTab("upcoming")}>Aktif ({upcoming.length})</button><button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>Riwayat ({history.length})</button></div>
    {tab==="upcoming" ? (upcoming.length===0?<Empty>Belum ada booking aktif. <Link to="/booking">Buat booking sekarang.</Link></Empty>:<div className="cards">{upcoming.map(b=><BookingCard key={b.id} booking={b} branchName={branches.find(x=>x.id===b.branchId)?.name} onCancel={async()=>{if(confirm("Batalkan booking ini?")){try{await cancelBooking(b,profile!.uid);await load()}catch(e){setError(e instanceof Error?e.message:"Gagal membatalkan booking.")}}}}/>)}</div>) : (history.length===0?<Empty>Belum ada riwayat booking.</Empty>:<div className="cards">{history.map(b=><BookingRow key={b.id} booking={b} branchName={branches.find(x=>x.id===b.branchId)?.name}/>)}</div>)}
  </div>;
}
function BookingCard({booking,branchName,onCancel}:{booking:Booking;branchName?:string;onCancel:()=>void}){return <div className="booking-card"><div className="card-top"><span className={`status ${booking.status}`}>{labels[booking.status]||booking.status}</span><b>{booking.code}</b></div><h3>{booking.serviceName}</h3>{booking.serviceItems&&booking.serviceItems.length>1&&<div className="service-pills">{booking.serviceItems.map(s=><span key={s.serviceId}>{s.serviceName}</span>)}</div>}<div className="meta"><span><MapPin size={15}/>{branchName||booking.branchId||"Cabang"}</span><span><UserRound size={15}/>{booking.barberName||"Barber mana saja"}</span><span><CalendarDays size={15}/>{booking.date}</span><span><Clock3 size={15}/>{booking.startTime}–{booking.endTime}</span></div><div className="card-bottom"><strong>{formatIDR(booking.price)}</strong>{booking.status!=="IN_SERVICE"&&<button className="btn danger" onClick={onCancel}>Batalkan</button>}</div></div>}
function BookingRow({booking,branchName}:{booking:Booking;branchName?:string}){return <div className="booking-history-row"><div><b>{booking.code}</b><span>{booking.serviceName}</span></div><div><span>{branchName||"Cabang"}</span><span>{booking.date} • {booking.startTime}</span></div><span className={`status ${booking.status}`}>{labels[booking.status]||booking.status}</span><strong>{formatIDR(booking.price)}</strong></div>}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
