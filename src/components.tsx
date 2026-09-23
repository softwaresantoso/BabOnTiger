import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { CalendarDays, Home, LogOut, Scissors, Users, UserRound, LayoutDashboard, Store, Clock3, Receipt, Package, Tag, QrCode, BarChart3, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useBusiness } from "./context/BusinessContext";

export function Logo() {
  const { business } = useBusiness();
  return <Link to="/" className="brand">
    {business.logoUrl ? <img className="brand-logo" src={business.logoUrl} alt={business.name}/> : <span className="brand-mark">BO</span>}
    <span><b>{business.name}</b><small>Barber Online</small></span>
  </Link>;
}
export function Loading() { return <div className="center"><div className="spinner" /><p>Memuat...</p></div>; }
export function ErrorBox({ message }: { message: string }) { return <div className="alert error">{message}</div>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }

function homeForRole(role?: string) {
  if (role === "owner") return "/owner";
  if (role === "barber") return "/barber";
  return "/dashboard";
}

export function PublicLayout() {
  const { profile, logout } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId } = useBusiness();
  return <div className="app-shell">
    <header className="topbar">
      <Logo />
      <nav className="desktop-nav">
        <Link to="/">Beranda</Link>
        {branches.length > 0 && <label className="branch-switcher"><Store size={15}/><select value={selectedBranchId ?? ""} onChange={e => setSelectedBranchId(e.target.value)}><option value="">Cabang</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
        <Link to="/booking">Booking</Link>
        <Link to={selectedBranchId ? `/queue/${selectedBranchId}` : "/"}>Antrean</Link>
        {profile ? <Link to={homeForRole(profile.role)}>Dashboard</Link> : <Link to="/login">Masuk</Link>}
        {profile && <button className="link-button" onClick={logout}><LogOut size={16}/> Keluar</button>}
      </nav>
    </header>
    <main><Outlet /></main>
    <footer className="footer"><span>Barber Online</span><span>Custom Barber Operations PWA</span></footer>
  </div>;
}

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { profile, loading, error, retry, firebaseUser } = useAuth();
  if (loading) return <Loading />;
  // Sudah login (ada firebaseUser) tapi gagal ambil dokumen profil dari Firestore
  // (mis. koneksi putus) — jangan redirect ke /login, itu bikin bingung karena
  // seolah login gagal padahal auth-nya sukses. Kasih tombol retry.
  if (firebaseUser && !profile && error) {
    return <div className="center"><ErrorBox message={`Gagal memuat profil akun: ${error}`} /><button className="btn primary" onClick={retry}>Coba lagi</button></div>;
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to={homeForRole(profile.role)} replace />;
  return <Outlet />;
}

const ownerNav = [
  ["/owner", "Dashboard", LayoutDashboard],
  ["/owner/bookings", "Booking", CalendarDays],
  ["/owner/services", "Layanan", Scissors],
  ["/owner/barbers", "Barber", UserRound],
  ["/owner/customers", "Pelanggan", Users],
  ["/owner/transactions", "Transaksi", Receipt],
  ["/owner/products", "Produk & Stok", Package],
  ["/owner/promos", "Promo", Tag],
  ["/owner/attendance", "Attendance", QrCode],
  ["/owner/reports", "Laporan", BarChart3],
  ["/owner/settings", "Pengaturan", Settings]
] as const;

export function AdminLayout() {
  const { profile, logout } = useAuth();
  return <div className="admin-shell">
    <aside className="sidebar">
      <Logo />
      <div className="side-label">OWNER</div>
      <nav>{ownerNav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/owner"}><Icon size={18}/>{label}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="muted">{profile?.name}</div>
        <button className="btn ghost full" onClick={logout}><LogOut size={16}/> Keluar</button>
      </div>
    </aside>
    <main className="admin-main"><Outlet /></main>
  </div>;
}

export function BarberLayout() {
  const { profile, logout } = useAuth();
  return <div className="admin-shell">
    <aside className="sidebar">
      <Logo />
      <div className="side-label">BARBER</div>
      <nav><NavLink to="/barber" end><LayoutDashboard size={18}/> Hari Ini</NavLink><NavLink to="/barber/transactions"><Receipt size={18}/> Transaksi</NavLink></nav>
      <div className="sidebar-bottom">
        <div className="muted">{profile?.name}</div>
        <button className="btn ghost full" onClick={logout}><LogOut size={16}/> Keluar</button>
      </div>
    </aside>
    <main className="admin-main"><Outlet /></main>
  </div>;
}

export function CustomerLayout() {
  const { profile, logout } = useAuth();
  return <div className="app-shell">
    <header className="topbar">
      <Logo />
      <nav className="desktop-nav">
        <Link to="/dashboard"><Home size={16}/> Dashboard</Link>
        <Link to="/booking"><CalendarDays size={16}/> Booking</Link>
        <Link to="/promos"><Tag size={16}/> Promo</Link><Link to="/account"><UserRound size={16}/> Akun</Link>
        <button className="link-button" onClick={logout}><LogOut size={16}/> Keluar</button>
      </nav>
    </header>
    <main className="container">{profile && <div className="welcome"><div><div className="eyebrow">CUSTOMER AREA</div><h2>Halo, {profile.name}</h2></div><Link className="btn primary" to="/booking">Booking Sekarang</Link></div>}<Outlet /></main>
  </div>;
}
