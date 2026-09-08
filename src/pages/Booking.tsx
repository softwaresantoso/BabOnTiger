import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Scissors, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getActiveBarbers, getActiveServices } from "../services/data";
import { createBooking, getAvailableSlots } from "../services/booking";
import type { Barber, Service } from "../types";
import { ErrorBox, Loading } from "../components";

function todayISO() { return new Date().toISOString().slice(0,10); }

export default function Booking() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{ Promise.all([getActiveServices(),getActiveBarbers()]).then(([s,b])=>{setServices(s);setBarbers(b);if(s[0])setServiceId(s[0].id);if(b[0])setBarberId(b[0].id)}).catch(e=>setError(e.message)).finally(()=>setLoading(false)); },[]);
  const service = useMemo(()=>services.find(x=>x.id===serviceId),[services,serviceId]);
  const barber = useMemo(()=>barbers.find(x=>x.id===barberId),[barbers,barberId]);

  useEffect(()=>{
    if (!service || !barber || !date) return;
    setTime(""); setError("");
    getAvailableSlots(barber,service,date).then(setSlots).catch(e=>setError(e.message));
  },[service?.id, barber?.id, date]);

  async function submit() {
    if (!profile) { nav("/login?return=/booking"); return; }
    if (!service || !barber || !time) return;
    setBusy(true); setError("");
    try {
      const result = await createBooking({
  customerId: profile.uid,
  customerName: profile.name,
  customerPhone: profile.phone ?? "",
  barber,
  service,
  date,
  startTime: time,
  notes
});
      nav(`/booking/success/${result.id}`);
    } catch(e) { setError(e instanceof Error ? e.message : "Booking gagal."); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading/>;
  return <div className="container narrow booking-page">
    <div className="eyebrow">ONLINE BOOKING</div><h1>Pilih jadwalmu.</h1><p className="lead">Slot tersedia dihitung dari jadwal barber, durasi layanan, break, dan booking yang sudah masuk.</p>
    {error && <ErrorBox message={error}/>}
    <div className="booking-grid">
      <section className="panel">
        <h3><Scissors size={18}/> 1. Layanan</h3>
        <div className="choice-grid">{services.map(s=><button key={s.id} className={`choice ${serviceId===s.id?"selected":""}`} onClick={()=>setServiceId(s.id)}><b>{s.name}</b><span>{s.durationMinutes} menit • {formatIDR(s.price)}</span></button>)}</div>
      </section>
      <section className="panel">
        <h3><UserRound size={18}/> 2. Barber</h3>
        <div className="choice-grid">{barbers.map(b=><button key={b.id} className={`choice ${barberId===b.id?"selected":""}`} onClick={()=>setBarberId(b.id)}><b>{b.name}</b><span>{b.bio || "Barber profesional"}</span></button>)}</div>
      </section>
      <section className="panel">
        <h3><CalendarDays size={18}/> 3. Tanggal</h3>
        <input type="date" min={todayISO()} value={date} onChange={e=>setDate(e.target.value)}/>
      </section>
      <section className="panel">
        <h3><Clock3 size={18}/> 4. Jam</h3>
        {slots.length ? <div className="time-grid">{slots.map(t=><button key={t} className={`time ${time===t?"selected":""}`} onClick={()=>setTime(t)}>{t}</button>)}</div> : <div className="empty">Tidak ada slot tersedia pada tanggal ini.</div>}
      </section>
      <section className="panel">
        <h3>5. Catatan</h3>
        <textarea rows={3} placeholder="Opsional, mis. model rambut..." value={notes} onChange={e=>setNotes(e.target.value)}/>
      </section>
      <section className="summary panel">
        <div><span>Layanan</span><b>{service?.name || "-"}</b></div>
        <div><span>Barber</span><b>{barber?.name || "-"}</b></div>
        <div><span>Jadwal</span><b>{date} {time || "-"}</b></div>
        <div><span>Total</span><strong>{service ? formatIDR(service.price) : "-"}</strong></div>
        {!profile && <div className="alert info">Login customer diperlukan sebelum booking.</div>}
        <button className="btn primary big full" disabled={!time || busy} onClick={submit}>{busy ? "Memproses..." : "Konfirmasi Booking"}</button>
      </section>
    </div>
  </div>;
}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
