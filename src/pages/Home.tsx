import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Clock3, ShieldCheck, Star } from "lucide-react";
import { useBusiness } from "../context/BusinessContext";

export default function Home() {
  const { business, branches } = useBusiness();
  return <div className="home">
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">{business.name.toUpperCase()}</div>
        <h1>Potong rambut.<br/><span>Kelola lebih rapi.</span></h1>
        <p>Barber Online membantu pelanggan booking, sementara owner dan barber mengelola jadwal serta operasional dari satu PWA.</p>
        <div className="hero-actions"><Link className="btn primary big" to="/booking">Booking Sekarang <ArrowRight size={18}/></Link><Link className="btn secondary big" to="/login">Masuk</Link></div>
        <div className="trust"><span><ShieldCheck size={16}/> Booking terjadwal</span><span><Clock3 size={16}/> Slot dinamis</span><span><CalendarCheck2 size={16}/> PWA mobile-first</span></div>
      </div>
      <div className="hero-card">
        <div className="tiger-eye">BO</div>
        <div className="hero-card-label">YOUR TIME. YOUR STYLE.</div>
      </div>
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">PILIH CABANG</div><h2>Booking di cabang pilihanmu.</h2></div></div>
      {branches.length === 0 ? <div className="panel empty">Belum ada cabang aktif.</div> : <div className="branch-home-grid">{branches.map(branch => <Link className="branch-home-card" key={branch.id} to={`/branch/${branch.id}`}><div><span className="eyebrow">CABANG</span><h3>{branch.name}</h3><p>{branch.address || "Alamat belum diatur"}</p></div><ArrowRight size={18}/></Link>)}</div>}
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">CARA KERJA</div><h2>Satu fondasi untuk operasional barber.</h2></div></div>
      <div className="feature-grid">
        <div className="feature"><CalendarCheck2/><h3>1. Booking</h3><p>Pelanggan memilih cabang, layanan, barber, dan jadwal.</p></div>
        <div className="feature"><Clock3/><h3>2. Operasional</h3><p>Owner dan barber menangani antrean serta layanan harian.</p></div>
        <div className="feature"><Star/><h3>3. Berkembang</h3><p>Data transaksi, produk, promo, dan laporan disiapkan untuk tahap berikutnya.</p></div>
      </div>
    </section>
  </div>;
}
