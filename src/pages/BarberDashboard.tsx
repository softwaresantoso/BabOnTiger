import { useEffect, useState } from "react";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAllBookings, updateBookingStatus } from "../services/data";
import type { Booking, BookingStatus } from "../types";
import { Empty, Loading } from "../components";

export default function BarberDashboard(){
 const {profile}=useAuth(); const [items,setItems]=useState<Booking[]>([]); const [loading,setLoading]=useState(true);
 async function load(){if(!profile)return;const all=await getAllBookings();setItems(all.filter(x=>x.barberId===profile.barberId && x.date===new Date().toISOString().slice(0,10)));setLoading(false)}
 useEffect(()=>{load()},[profile?.barberId]);
 if(loading)return <Loading/>;
 return <div><div className="section-head"><div><div className="eyebrow">BARBER WORKSPACE</div><h1>Jadwal Hari Ini</h1></div></div>{items.length===0?<Empty>Tidak ada booking hari ini.</Empty>:<div className="cards">{items.map(b=><div className="booking-card" key={b.id}><div className="card-top"><span className={`status ${b.status}`}>{b.status}</span><b>{b.code}</b></div><h3>{b.customerName}</h3><div className="meta"><span><UserRound size={15}/>{b.serviceName}</span><span><Clock3 size={15}/>{b.startTime}–{b.endTime}</span><span><CalendarDays size={15}/>{b.date}</span></div><div className="card-bottom"><select value={b.status} onChange={async e=>{await updateBookingStatus(b.id,e.target.value as BookingStatus);load()}}>{["PENDING","CONFIRMED","CHECKED_IN","IN_SERVICE","COMPLETED","NO_SHOW"].map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>}</div>
}
