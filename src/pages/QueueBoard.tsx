import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicQueueForDate } from "../services/queue";
import type { Queue } from "../types";
import { Empty, Loading } from "../components";
function today(){return new Date().toISOString().slice(0,10)}
export default function QueueBoard(){const {branchId}=useParams();const [items,setItems]=useState<Queue[]>([]);const [loading,setLoading]=useState(true);async function load(){if(!branchId)return;setLoading(true);try{setItems(await getPublicQueueForDate(branchId,today()))}finally{setLoading(false)}}useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[branchId]);if(loading)return <Loading/>;const active=items.filter(q=>!["COMPLETED","CANCELLED","NO_SHOW"].includes(q.status));return <div className="container narrow"><div className="eyebrow">LIVE QUEUE</div><h1>Antrean hari ini</h1><p className="lead">Nomor antrean diperbarui otomatis.</p>{active.length===0?<Empty>Belum ada antrean aktif.</Empty>:<div className="queue-board">{active.map(q=><div className={`queue-card ${q.status}`} key={q.id}><strong>#{q.queueNumber}</strong><div><b>{q.customerName}</b><span>{q.serviceName} • {q.barberName||"Barber mana saja"}</span></div><span className="status">{q.status}</span></div>)}</div>}</div>}
