import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  signIn,
  signUpCustomer,
  signUpBarber,
  getProfile,
} from "../services/auth";
import { auth } from "../lib/firebase";
import { ErrorBox } from "../components";

type RegisterMode = "customer" | "barber";

function homeForRole(role?: string) {
  if (role === "owner") return "/owner";
  if (role === "barber") return "/barber";
  return "/dashboard";
}

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerMode, setRegisterMode] =
    useState<RegisterMode>("customer");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const nav = useNavigate();

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
  }

  function switchToRegister(type: RegisterMode) {
    resetForm();
    setRegisterMode(type);
    setMode("register");
  }

  function switchToLogin() {
    resetForm();
    setMode("login");
  }

  async function resetPassword() {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setSuccess(
        "Link reset password sudah dikirim ke email jika akun tersedia."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim link reset password."
      );
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        const credential = await signIn(email, password);
        const profile = await getProfile(credential.user);

        if (!profile) {
          throw new Error("Profil pengguna belum tersedia.");
        }

        nav(homeForRole(profile.role), {
          replace: true,
        });

        return;
      }

      if (registerMode === "customer") {
        await signUpCustomer(
          name,
          phone,
          email,
          password
        );

        nav("/dashboard", {
          replace: true,
        });

        return;
      }

      await signUpBarber(
        name,
        phone,
        email,
        password
      );

      setSuccess(
        "Pendaftaran barber berhasil. Akun Anda menunggu persetujuan Owner."
      );

      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan."
      );
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="back">
          ← Kembali
        </Link>

        <div className="eyebrow">BARBER ONLINE</div>

        <h1>
          {mode === "login"
            ? "Masuk ke akun"
            : registerMode === "customer"
              ? "Buat akun customer"
              : "Daftar sebagai barber"}
        </h1>

        {error && <ErrorBox message={error} />}

        {success && (
          <div className="alert success">
            {success}
          </div>
        )}

        {mode === "register" &&
          registerMode === "barber" && (
            <div className="alert info">
              Setelah mendaftar, akun barber akan menunggu
              persetujuan Owner. Anda belum dapat menggunakan
              dashboard barber sebelum akun disetujui.
            </div>
          )}

        <form
          onSubmit={submit}
          className="form-stack"
        >
          {mode === "register" && (
            <>
              <label>
                Nama
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />
              </label>

              <label>
                No. WhatsApp
                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  required
                />
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              minLength={6}
              required
            />
          </label>

          <button
            className="btn primary full"
            type="submit"
          >
            {mode === "login"
              ? "Masuk"
              : registerMode === "customer"
                ? "Daftar Customer"
                : "Daftar sebagai Barber"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            className="switch"
            onClick={resetPassword}
          >
            Lupa password?
          </button>
        )}

        {mode === "login" ? (
          <>
            <button
              className="switch"
              type="button"
              onClick={() =>
                switchToRegister("customer")
              }
            >
              Belum punya akun? Daftar sebagai Customer
            </button>

            <button
              className="switch"
              type="button"
              onClick={() =>
                switchToRegister("barber")
              }
            >
              Daftar sebagai Barber
            </button>
          </>
        ) : (
          <button
            className="switch"
            type="button"
            onClick={switchToLogin}
          >
            Sudah punya akun? Masuk
          </button>
        )}
      </div>
    </div>
  );
}