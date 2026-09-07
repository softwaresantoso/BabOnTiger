import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Scissors, Users, UserRound } from "lucide-react";
import { getAllBookings, getAllBarbers, getAllServices } from "../services/data";
import type { Booking } from "../types";
import { Loading } from "../components";

export default function AdminDashboard(){
  const [bookings,setBookings]=useState<Booking[]>([]); const [barbers,setBarbers]=useState(0); const [services,setServices]=useState(0); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([getAllBookings(),getAllBarbers(),getAllServices()]).then(([b,ba,s])=>{setBookings(b);setBarbers(ba.length);setServices(s.length)}).finally(()=>setLoading(false))},[]);
  if(loading)return <Loading/>;
  const today=new Date().toISOString().slice(0,10);
  const todayItems=bookings.filter(b=>b.date===today);
  return <div><div className="section-head"><div><div className="eyebrow">CONTROL CENTER</div><h1>Dashboard Admin</h1></div><Link className="btn primary" to="/admin/bookings">Kelola Booking</Link></div>
    <div className="stat-grid"><Stat icon={CalendarDays} label="Booking hari ini" value={todayItems.length}/><Stat icon={Clock3} label="Menunggu" value={bookings.filter(b=>["PENDING","CONFIRMED"].includes(b.status)).length}/><Stat icon={UserRound} label="Barber" value={barbers}/><Stat icon={Scissors} label="Layanan" value={services}/></div>
    <div className="panel"><div className="panel-title"><h2>Booking hari ini</h2><Link to="/admin/bookings">Lihat semua →</Link></div>{todayItems.length===0?<p className="muted">Belum ada booking hari ini.</p>:<div className="table">{todayItems.slice(0,10).map(b=><div className="table-row" key={b.id}><b>{b.startTime}</b><span>{b.customerName}</span><span>{b.serviceName}</span><span>{b.barberName}</span><span className={`status ${b.status}`}>{b.status}</span></div>)}</div>}</div>
  </div>;
}
function Stat({icon:Icon,label,value}:{icon:any,label:string,value:number}){return <div className="stat"><Icon size={20}/><span>{label}</span><strong>{value}</strong></div>}
