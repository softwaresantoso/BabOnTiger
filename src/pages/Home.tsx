import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Clock3, ShieldCheck, Star } from "lucide-react";

export default function Home() {
  return <div className="home">
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow">BABON TIGER MARK I</div>
        <h1>Potong rambut.<br/><span>Tanpa antre panjang.</span></h1>
        <p>Booking barber favoritmu, pilih layanan, pilih waktu, lalu datang sesuai jadwal.</p>
        <div className="hero-actions"><Link className="btn primary big" to="/booking">Booking Sekarang <ArrowRight size={18}/></Link><Link className="btn secondary big" to="/login">Masuk</Link></div>
        <div className="trust"><span><ShieldCheck size={16}/> Slot terjadwal</span><span><Clock3 size={16}/> Pilih jam</span><span><CalendarCheck2 size={16}/> Booking online</span></div>
      </div>
      <div className="hero-card">
        <div className="tiger-eye">BT</div>
        <div className="hero-card-label">YOUR TIME. YOUR STYLE.</div>
      </div>
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">CARA KERJA</div><h2>Simple dari awal sampai selesai.</h2></div></div>
      <div className="feature-grid">
        <div className="feature"><CalendarCheck2/><h3>1. Pilih layanan</h3><p>Tentukan layanan dan barber yang kamu inginkan.</p></div>
        <div className="feature"><Clock3/><h3>2. Pilih waktu</h3><p>Slot otomatis menyesuaikan durasi layanan dan jadwal barber.</p></div>
        <div className="feature"><Star/><h3>3. Datang & selesai</h3><p>Tunjukkan kode booking dan nikmati layanan.</p></div>
      </div>
    </section>
  </div>;
}
