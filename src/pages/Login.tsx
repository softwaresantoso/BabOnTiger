import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getProfile, signIn, signUpCustomer } from "../services/auth";
import { ErrorBox } from "../components";

function getRoleHome(role: string) {
  if (role === "admin") return "/admin";
  if (role === "barber") return "/barber";
  return "/dashboard";
}

function getSafeReturnPath(search: string) {
  const value = new URLSearchParams(search).get("return");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const returnPath = getSafeReturnPath(location.search);

      if (mode === "login") {
        const user = await signIn(email, password);
        const profile = await getProfile(user.user);

        if (!profile) {
          throw new Error("Profil pengguna tidak ditemukan.");
        }

        // Hanya customer yang boleh kembali ke halaman booking.
        // Admin dan barber selalu diarahkan ke workspace masing-masing.
        if (profile.role === "customer" && returnPath) {
          nav(returnPath, { replace: true });
        } else {
          nav(getRoleHome(profile.role), { replace: true });
        }
      } else {
        await signUpCustomer(name, phone, email, password);
        nav(returnPath ?? "/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="back">← Kembali</Link>
        <div className="eyebrow">
          {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
        </div>
        <h1>{mode === "login" ? "Masuk ke BabOn" : "Buat akun customer"}</h1>

        {error && <ErrorBox message={error} />}

        <form onSubmit={submit} className="form-stack">
          {mode === "register" && (
            <>
              <label>
                Nama
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                No. WhatsApp
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <button className="btn primary full" type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          className="switch"
          type="button"
          disabled={submitting}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </div>
    </div>
  );
}
