import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, Scissors, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useBusiness } from "../context/BusinessContext";
import { getActiveBarbers, getActiveServices } from "../services/data";
import type { Barber, Service } from "../types";
import { Empty, ErrorBox, Loading } from "../components";

export default function BranchDetail() {
  const { branchId } = useParams();
  const { branches } = useBusiness();
  const branch = branches.find(b => b.id === branchId);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    Promise.all([getActiveServices(), getActiveBarbers()])
      .then(([s, b]) => {
        setServices(s.filter(x => !x.branchId || x.branchId === branchId));
        setBarbers(b.filter(x => !x.branchId || x.branchId === branchId));
      })
      .catch(e => setError(e instanceof Error ? e.message : "Gagal memuat cabang."))
      .finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <Loading />;
  if (!branch) return <div className="container narrow"><Empty>Cabang tidak ditemukan atau tidak aktif.</Empty></div>;
  return <div className="container branch-detail">
    {error && <ErrorBox message={error} />}
    <div className="branch-hero panel">
      <div>
        <div className="eyebrow">CABANG</div>
        <h1>{branch.name}</h1>
        <p className="lead">{branch.address || "Alamat cabang belum diatur."}</p>
        {branch.phone && <p className="muted">{branch.phone}</p>}
      </div>
      <div className="branch-actions">
        <Link className="btn primary big" to={`/booking?branch=${branch.id}`}>Booking di cabang ini <ArrowRight size={18}/></Link>
        <Link className="btn secondary" to={`/queue/${branch.id}`}>Lihat antrean</Link>
      </div>
    </div>
    <section className="section branch-section">
      <div className="section-head"><div><div className="eyebrow">LAYANAN</div><h2>Pilih layanan</h2></div><Scissors /></div>
      {services.length === 0 ? <Empty>Belum ada layanan aktif di cabang ini.</Empty> : <div className="feature-grid branch-service-grid">{services.map(s => <div className="feature" key={s.id}>{s.imageUrl&&<img className="catalog-image" src={s.imageUrl} alt={s.name}/>}<h3>{s.name}</h3><p>{s.description || "Layanan barber profesional."}</p><b>{s.durationMinutes} menit • {formatIDR(s.price)}</b></div>)}</div>}
    </section>
    <section className="section branch-section">
      <div className="section-head"><div><div className="eyebrow">BARBER</div><h2>Tim barber</h2></div><UserRound /></div>
      {barbers.length === 0 ? <Empty>Belum ada barber aktif di cabang ini.</Empty> : <div className="cards">{barbers.map(b => <div className="mini-card" key={b.id}>{b.photoUrl?<img className="thumb" src={b.photoUrl} alt={b.name}/>:<div className="avatar">{b.name.charAt(0).toUpperCase()}</div>}<div className="grow"><b>{b.name}</b><p>{b.bio || "Barber profesional"}</p><span>{b.specialties?.join(" • ") || "Siap melayani"}</span></div></div>)}</div>}
    </section>
    <section className="panel branch-note"><CalendarDays size={18}/><div><b>Booking fleksibel</b><p className="muted">Kamu dapat memilih beberapa layanan sekaligus, memilih barber tertentu atau barber mana saja, lalu melihat slot yang tersedia.</p></div></section>
  </div>;
}
function formatIDR(v:number){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v)}
