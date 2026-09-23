import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "../types";
import { getProfile, logout, observeAuth } from "../services/auth";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return observeAuth(async (user) => {
      setFirebaseUser(user);
      try {
        setProfile(user ? await getProfile(user) : null);
        setError(null);
      } catch (err) {
        // Jangan biarkan profile "menghilang" diam-diam saat fetch gagal
        // (mis. koneksi putus) — user tetap authenticated, hanya profilnya
        // belum termuat. Simpan pesan error supaya UI bisa kasih tombol retry
        // alih-alih ProtectedRoute mengira user belum login lalu redirect ke /login.
        setError(err instanceof Error ? err.message : "Gagal memuat profil pengguna.");
      } finally {
        setLoading(false);
      }
    });
  }, [retryTick]);

  const retry = () => setRetryTick(t => t + 1);

  return <AuthContext.Provider value={{ firebaseUser, profile, loading, error, retry, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
