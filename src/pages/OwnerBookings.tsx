import { useEffect, useState } from "react";
import { getAllBookings, updateBookingStatus } from "../services/data";
import type { Booking, BookingStatus } from "../types";
import { Empty, Loading } from "../components";

const statuses: BookingStatus[]=["PENDING","CONFIRMED","CHECKED_IN","IN_SERVICE","COMPLETED","NO_SHOW","CANCELLED"];
export default function AdminBookings(){
  const [items,setItems]=useState<Booking[]>([]); const [loading,setLoading]=useState(true); const [filter,setFilter]=useState("ALL");
  async function load(){setLoading(true);try{setItems(await getAllBookings())}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function change(id:string,status:BookingStatus){await updateBookingStatus(id,status);load()}
  if(loading)return <Loading/>;
  const shown=filter==="ALL"?items:items.filter(x=>x.status===filter);
  return <div><div className="section-head"><div><div className="eyebrow">OPERATIONS</div><h1>Booking</h1></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>ALL</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>
    {shown.length===0?<Empty>Tidak ada data.</Empty>:<div className="table panel">{shown.map(b=><div className="table-row booking-admin" key={b.id}><div><b>{b.startTime}</b><small>{b.date}</small></div><div><b>{b.customerName}</b><small>{b.customerPhone||"-"}</small></div><div><b>{b.serviceName}</b><small>{b.barberName}</small></div><div className="status-cell"><span className={`status ${b.status}`}>{b.status}</span><select value={b.status} onChange={e=>change(b.id,e.target.value as BookingStatus)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div>}
  </div>;
}
