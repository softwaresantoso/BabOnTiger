import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Camera, CheckCircle2, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { checkInBarber, getTodayAttendance } from "../services/attendance";
import { todayKey } from "../lib/date";
import { ErrorBox, Loading } from "../components";
import type { Attendance } from "../types";

const SCANNER_ID = "barber-qr-reader";

function parseCheckInValue(value: string) {
  try {
    const url = new URL(value);
    if (url.pathname !== "/barber/check-in") return null;
    const branchId = url.searchParams.get("branchId");
    const businessId = url.searchParams.get("businessId");
    if (!branchId || !businessId) return null;
    return { branchId, businessId };
  } catch {
    return null;
  }
}

export default function BarberCheckIn() {
  const { profile } = useAuth();
  const { business, branches } = useBusiness();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const date = todayKey(business.timezone);

  useEffect(() => {
    if (!profile?.barberId) return;
    getTodayAttendance(profile.barberId, date).then(setAttendance).catch(() => undefined);
  }, [date, profile?.barberId]);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // Camera may already be stopped by the browser.
    }
    scannerRef.current = null;
    setScanning(false);
  }

  async function processValue(value: string) {
    const payload = parseCheckInValue(value);
    if (!payload) {
      setError("QR tidak dikenali. Gunakan QR Check-in dari cabang Barber Online.");
      return;
    }
    if (payload.businessId !== business.id) {
      setError("QR berasal dari bisnis yang berbeda.");
      return;
    }
    if (!profile?.barberId || !profile.branchId) {
      setError("Akun barber belum terhubung ke cabang.");
      return;
    }
    if (payload.branchId !== profile.branchId) {
      setError("QR ini bukan QR untuk cabang Anda.");
      return;
    }
    const branch = branches.find(item => item.id === payload.branchId);
    if (!branch || !branch.active) {
      setError("Cabang pada QR tidak aktif atau tidak ditemukan.");
      return;
    }

    try {
      setError("");
      await stopScanner();
      const result = await checkInBarber({
        barberId: profile.barberId,
        barberName: profile.name,
        branchId: profile.branchId,
        date,
        method: "QR",
      });
      setAttendance(result);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in QR gagal.");
    }
  }

  useEffect(() => {
    const branchId = searchParams.get("branchId");
    const businessId = searchParams.get("businessId");
    if (branchId && businessId) {
      processValue(window.location.href);
    }
    return () => { void stopScanner(); };
    // Scanner lifecycle is controlled by explicit start/stop buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    if (attendance?.status === "PRESENT") return;
    setError("");
    setSuccess(false);
    setScanning(true);
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        value => { void processValue(value); },
        () => undefined,
      );
    } catch (err) {
      scannerRef.current = null;
      setScanning(false);
      setError(err instanceof Error ? err.message : "Kamera tidak dapat dibuka. Pastikan izin kamera diberikan.");
    }
  }

  if (!profile?.barberId || !profile.branchId) return <ErrorBox message="Akun barber belum terhubung ke barber profile dan cabang." />;

  const branchName = branches.find(branch => branch.id === profile.branchId)?.name ?? profile.branchId;

  return (
    <div className="container narrow-page">
      <div className="section-head">
        <div>
          <div className="eyebrow">BARBER CHECK-IN</div>
          <h1>Check-in QR</h1>
          <p className="muted">Scan QR yang ditampilkan Owner untuk cabang Anda.</p>
        </div>
        <Link className="btn ghost" to="/barber"><ArrowLeft size={16}/> Kembali</Link>
      </div>

      {error && <ErrorBox message={error} />}

      {success || attendance?.status === "PRESENT" ? (
        <div className="panel success-panel">
          <CheckCircle2 size={36}/>
          <div>
            <strong>Check-in berhasil</strong>
            <p className="muted">{profile.name} aktif di {branchName}. Sekarang Anda dapat mulai melayani antrean.</p>
          </div>
          <Link className="btn primary" to="/barber">Buka Workspace</Link>
        </div>
      ) : (
        <div className="panel qr-scanner-panel">
          <div className="qr-scanner-icon"><Camera size={26}/></div>
          <h2>Scan QR Cabang</h2>
          <p className="muted"><MapPin size={15}/> Cabang: {branchName}</p>
          <div id={SCANNER_ID} className="qr-reader" />
          {!scanning && <button className="btn primary full" onClick={() => void startScanner()}><Camera size={16}/> Buka Kamera & Scan QR</button>}
          {scanning && <button className="btn secondary full" onClick={() => void stopScanner()}>Hentikan Kamera</button>}
        </div>
      )}
    </div>
  );
}
