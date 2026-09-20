import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { signIn, signUpCustomer, getProfile } from "../services/auth";
import { auth } from "../lib/firebase";
import { ErrorBox } from "../components";

function homeForRole(role?: string) {
  if (role === "owner") return "/owner";
  if (role === "barber") return "/barber";
  return "/dashboard";
}

export default function Login() {
  const [mode, setMode] = useState<"login"|"register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function resetPassword() {
    setError("");
    if (!email.trim()) { setError("Masukkan email terlebih dahulu."); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); alert("Link reset password sudah dikirim ke email jika akun tersedia."); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal mengirim link reset password."); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      if (mode === "login") {
        const credential = await signIn(email, password);
        const profile = await getProfile(credential.user);
        if (!profile) throw new Error("Profil pengguna belum tersedia.");
        nav(homeForRole(profile.role), { replace: true });
      } else {
        await signUpCustomer(name, phone, email, password);
        nav("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }
  return <div className="auth-page"><div className="auth-card">
    <Link to="/" className="back">← Kembali</Link>
    <div className="eyebrow">BARBER ONLINE</div>
    <h1>{mode === "login" ? "Masuk ke akun" : "Buat akun customer"}</h1>
    {error && <ErrorBox message={error}/>} 
    <form onSubmit={submit} className="form-stack">
      {mode === "register" && <>
        <label>Nama<input value={name} onChange={e=>setName(e.target.value)} required/></label>
        <label>No. WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)} required/></label>
      </>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} required/></label>
      <button className="btn primary full" type="submit">{mode === "login" ? "Masuk" : "Daftar"}</button>
    </form>
    {mode === "login" && <button type="button" className="switch" onClick={resetPassword}>Lupa password?</button>}
    <button className="switch" onClick={()=>{setMode(mode==="login"?"register":"login");setError("")}}>{mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}</button>
  </div></div>;
}
