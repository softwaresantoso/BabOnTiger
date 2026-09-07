import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn, signUpCustomer } from "../services/auth";
import { ErrorBox } from "../components";

export default function Login() {
  const [mode, setMode] = useState<"login"|"register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    try {
      if (mode === "login") await signIn(email, password);
      else await signUpCustomer(name, phone, email, password);
      nav("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }
  return <div className="auth-page"><div className="auth-card">
    <Link to="/" className="back">← Kembali</Link>
    <div className="eyebrow">{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</div>
    <h1>{mode === "login" ? "Masuk ke BabOn" : "Buat akun customer"}</h1>
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
    <button className="switch" onClick={()=>{setMode(mode==="login"?"register":"login");setError("")}}>{mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}</button>
  </div></div>;
}
