import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { updateCustomerProfile } from "../services/auth";
import { ErrorBox } from "../components";

export default function CustomerAccount() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setName(profile?.name || ""); setPhone(profile?.phone || ""); }, [profile?.uid]);
  if (!profile) return null;

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await updateCustomerProfile(profile.uid, name.trim(), phone.trim()); setMessage("Profil berhasil diperbarui."); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal memperbarui profil."); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!auth.currentUser?.email) { setError("Email akun tidak tersedia."); return; }
    setError(""); setMessage("");
    try { await sendPasswordResetEmail(auth, auth.currentUser.email); setMessage("Link reset password dikirim ke email akunmu."); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal mengirim link reset password."); }
  }
  return <div className="account-page">
    <div className="section-head"><div><div className="eyebrow">AKUN SAYA</div><h1>Profil pelanggan</h1></div><UserRound size={28}/></div>
    {error && <ErrorBox message={error}/>} {message && <div className="alert info">{message}</div>}
    <div className="account-grid">
      <form className="panel form-stack" onSubmit={save}><h3>Data pribadi</h3><label>Nama lengkap<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>No. WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} required/></label><label>Email<input value={auth.currentUser?.email || ""} disabled/></label><button className="btn primary" disabled={busy}><Save size={16}/>{busy ? "Menyimpan..." : "Simpan perubahan"}</button></form>
      <div className="panel account-security"><h3><KeyRound size={18}/> Keamanan akun</h3><p className="muted">Gunakan email akun untuk menerima link pembuatan password baru.</p><button className="btn secondary" onClick={resetPassword}>Kirim link reset password</button></div>
    </div>
  </div>;
}
