import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, Scissors, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { ensureGuestCustomer } from "../services/auth";
import { getActiveBarbers, getActiveServices } from "../services/data";
import { createBooking, getAvailableSlots } from "../services/booking";
import type { Barber, Service } from "../types";
import { ErrorBox, Loading } from "../components";
function todayISO(){return new Date().toISOString().slice(0,10)}
export default function Booking(){
 const {profile}=useAuth(); const {selectedBranchId}=useBusiness(); const nav=useNavigate();
 const [services,setServices]=useState<Service[]>([]),[barbers,setBarbers]=useState<Barber[]>([]),[serviceId,setServiceId]=useState(""),[barberId,setBarberId]=useState(""),[date,setDate]=useState(todayISO()),[time,setTime]=useState(""),[name,setName]=useState(profile?.name||""),[phone,setPhone]=useState(profile?.phone||""),[notes,setNotes]=useState(""),[slots,setSlots]=useState<string[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{Promise.all([getActiveServices(),getActiveBarbers()]).then(([s,b])=>{setServices(s.filter(x=>!x.branchId||x.branchId===selectedBranchId));setBarbers(b.filter(x=>!x.branchId||x.branchId===selectedBranchId));if(s[0])setServiceId(s[0].id)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[selectedBranchId]);
 const service=useMemo(()=>services.find(x=>x.id===serviceId),[services,serviceId]); const barber=useMemo(()=>barbers.find(x=>x.id===barberId),[barbers,barberId]);
 useEffect(()=>{if(!service||!date)return;setTime("");setError("");if(barberId==="any"){Promise.all(barbers.map(b=>getAvailableSlots(b,service,date))).then(all=>setSlots([...new Set(all.flat())].sort())).catch(e=>setError(e.message));return;}if(!barber){setSlots([]);return;}getAvailableSlots(barber,service,date).then(setSlots).catch(e=>setError(e.message))},[service?.id,barber?.id,barberId,date,barbers]);
 async function submit(){if(!selectedBranchId){setError("Pilih cabang terlebih dahulu.");return}if(!service||!time){setError("Pilih layanan dan jam.");return}if(!name.trim()||!phone.trim()){setError("Nama dan nomor WhatsApp diperlukan.");return}setBusy(true);setError("");try{const customer=profile??await ensureGuestCustomer(name.trim(),phone.trim());const result=await createBooking({customerId:customer.uid,customerName:name.trim(),customerPhone:phone.trim(),branchId:selectedBranchId,barber:barberId==="any"?undefined:barber,service,date,startTime:time,notes});nav(`/booking/success/${result.id}?code=${encodeURIComponent(result.code)}&queue=${result.queueNumber}`)}catch(e){setError(e instanceof Error?e.message:"Booking gagal.")}finally{setBusy(false)}}
 if(loading)return <Loading/>;
 return <div className="container narrow booking-page"><div className="eyebrow">ONLINE BOOKING</div><h1>Pilih jadwalmu.</h1><p className="lead">Pilih cabang, layanan, barber, tanggal, dan jam. Nomor antrean otomatis dibuat per cabang dan tanggal.</p>{error&&<ErrorBox message={error}/>}<div className="booking-grid">
 <section className="panel"><h3><Scissors size={18}/> 1. Layanan</h3><div className="choice-grid">{services.map(s=><button key={s.id} className={`choice ${serviceId===s.id?"selected":""}`} onClick={()=>setServiceId(s.id)}><b>{s.name}</b><span>{s.durationMinutes} menit • {formatIDR(s.price)}</span></button>)}</div></section>
 <section className="panel"><h3><UserRound size={18}/> 2. Barber</h3><div className="choice-grid"><button className={`choice ${barberId==="any"?"selected":""}`} onClick={()=>setBarberId("any")}><b>Barber mana saja</b><span>Sistem memilih barber yang tersedia</span></button>{barbers.map(b=><button key={b.id} className={`choice ${barberId===b.id?"selected":""}`} onClick={()=>setBarberId(b.id)}><b>{b.name}</b><span>{b.bio||"Barber profesional"}</span></button>)}</div></section>
 <section className="panel"><h3><CalendarDays size={18}/> 3. Tanggal</h3><input type="date" min={todayISO()} value={date} onChange={e=>setDate(e.target.value)}/></section>
 <section className="panel"><h3><Clock3 size={18}/> 4. Jam</h3>{slots.length?<div className="time-grid">{slots.map(t=><button key={t} className={`time ${time===t?"selected":""}`} onClick={()=>setTime(t)}>{t}</button>)}</div>:<div className="empty">Tidak ada slot tersedia pada tanggal ini.</div>}</section>
 {!profile&&<section className="panel"><h3>5. Data pelanggan</h3><input placeholder="Nama lengkap" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Nomor WhatsApp" value={phone} onChange={e=>setPhone(e.target.value)}/><small>Login tidak wajib. Data ini digunakan untuk konfirmasi booking.</small></section>}
 <section className="panel"><h3>Catatan</h3><textarea rows={3} placeholder="Opsional, mis. model rambut..." value={notes} onChange={e=>setNotes(e.target.value)}/></section>
 <section className="summary panel"><div><span>Layanan</span><b>{service?.name||"-"}</b></div><div><span>Barber</span><b>{barberId==="any"?"Barber mana saja":(barber?.name||"-")}</b></div><div><span>Jadwal</span><b>{date} {time||"-"}</b></div><div><span>Total</span><strong>{service?formatIDR(service.price):"-"}</strong></div><button className="btn primary big full" disabled={!time||busy||!selectedBranchId} onClick={submit}>{busy?"Memproses...":"Konfirmasi Booking"}</button></section>
 </div></div>
}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
