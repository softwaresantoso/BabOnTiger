import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { CalendarDays, ClipboardList, Home, LogIn, LogOut, Scissors, Settings, Users, UserRound, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { BUSINESS_NAME } from "./lib/firebase";

export function Logo() {
  return <Link to="/" className="brand"><span className="brand-mark">BT</span><span><b>BabOn</b><small>Tiger mark I</small></span></Link>;
}
export function Loading() { return <div className="center"><div className="spinner" /><p>Memuat...</p></div>; }
export function ErrorBox({ message }: { message: string }) { return <div className="alert error">{message}</div>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }

export function PublicLayout() {
  const { profile, logout } = useAuth();
  return <div className="app-shell">
    <header className="topbar">
      <Logo />
      <nav className="desktop-nav">
        <Link to="/">Beranda</Link>
        <Link to="/booking">Booking</Link>
        {profile ? <Link to="/dashboard">Dashboard</Link> : <Link to="/login">Masuk</Link>}
        {profile && <button className="link-button" onClick={logout}>Keluar</button>}
      </nav>
    </header>
    <main><Outlet /></main>
    <footer className="footer"><span>{BUSINESS_NAME}</span><span>Booking Barber Shop • PWA</span></footer>
  </div>;
}

export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const adminNav = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/bookings", "Booking", CalendarDays],
  ["/admin/services", "Layanan", Scissors],
  ["/admin/barbers", "Barber", UserRound],
  ["/admin/customers", "Pelanggan", Users]
] as const;

export function AdminLayout() {
  const { profile, logout } = useAuth();
  return <div className="admin-shell">
    <aside className="sidebar">
      <Logo />
      <div className="side-label">ADMIN</div>
      <nav>{adminNav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/admin"}><Icon size={18}/>{label}</NavLink>)}</nav>
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
      <nav><NavLink to="/barber" end><LayoutDashboard size={18}/> Hari Ini</NavLink></nav>
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
        <button className="link-button" onClick={logout}><LogOut size={16}/> Keluar</button>
      </nav>
    </header>
    <main className="container">{profile && <div className="welcome"><div><div className="eyebrow">CUSTOMER AREA</div><h2>Halo, {profile.name}</h2></div><Link className="btn primary" to="/booking">Booking Sekarang</Link></div>}<Outlet /></main>
  </div>;
}
