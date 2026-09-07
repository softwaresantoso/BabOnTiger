import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, Scissors, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cancelBooking } from "../services/booking";
import { getCustomerBookings } from "../services/data";
import type { Booking } from "../types";
import { Empty, ErrorBox, Loading } from "../components";

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const [items,setItems]=useState<Booking[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  async function load(){ if(!profile)return; setLoading(true); try{setItems(await getCustomerBookings(profile.uid))}catch(e){setError(e instanceof Error?e.message:"Gagal memuat")}finally{setLoading(false)}}
  useEffect(()=>{load()},[profile?.uid]);
  if(loading)return <Loading/>;
  const upcoming=items.filter(b=>!["COMPLETED","CANCELLED","NO_SHOW"].includes(b.status));
  return <div>
    {error&&<ErrorBox message={error}/>}
    <div className="section-head"><div><div className="eyebrow">MY BOOKING</div><h1>Jadwal saya</h1></div><Link className="btn primary" to="/booking">+ Booking</Link></div>
    {upcoming.length===0?<Empty>Belum ada booking aktif.</Empty>:<div className="cards">{upcoming.map(b=><BookingCard key={b.id} booking={b} onCancel={async()=>{if(confirm("Batalkan booking ini?")){await cancelBooking(b,profile!.uid);load()}}}/>)}</div>}
    <div className="section-head compact"><h2>Riwayat</h2></div>
    {items.filter(b=>["COMPLETED","CANCELLED","NO_SHOW"].includes(b.status)).map(b=><BookingRow key={b.id} booking={b}/>)}
  </div>;
}
function BookingCard({booking,onCancel}:{booking:Booking,onCancel:()=>void}){return <div className="booking-card"><div className="card-top"><span className={`status ${booking.status}`}>{booking.status}</span><b>{booking.code}</b></div><h3>{booking.serviceName}</h3><div className="meta"><span><UserRound size={15}/>{booking.barberName}</span><span><CalendarDays size={15}/>{booking.date}</span><span><Clock3 size={15}/>{booking.startTime}–{booking.endTime}</span></div><div className="card-bottom"><strong>{formatIDR(booking.price)}</strong><button className="btn danger" onClick={onCancel}>Batalkan</button></div></div>}
function BookingRow({booking}:{booking:Booking}){return <div className="table-row"><b>{booking.code}</b><span>{booking.date} {booking.startTime}</span><span>{booking.serviceName}</span><span className={`status ${booking.status}`}>{booking.status}</span></div>}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
