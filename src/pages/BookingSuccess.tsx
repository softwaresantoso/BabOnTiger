import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function BookingSuccess() {
  const { id } = useParams();
  return <div className="success-page">
    <div className="success-card"><CheckCircle2 size={64}/><div className="eyebrow">BOOKING BERHASIL</div><h1>Jadwalmu sudah tercatat.</h1><p>Simpan halaman ini atau buka dashboard untuk melihat detail booking.</p><div className="code">{id?.slice(-8).toUpperCase()}</div><div className="actions"><Link className="btn primary" to="/dashboard">Lihat Booking</Link><Link className="btn secondary" to="/">Kembali</Link></div></div>
  </div>;
}
