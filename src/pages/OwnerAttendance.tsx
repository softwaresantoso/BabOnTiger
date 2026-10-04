import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode } from "lucide-react";
import { useBusiness } from "../context/BusinessContext";
import { ErrorBox, Loading } from "../components";
import { getQueueForDate } from "../services/queue";
import { todayKey } from "../lib/date";
import type { Branch, Queue } from "../types";

export default function OwnerAttendance() {
  const { business, branches } = useBusiness();
  const [branchId, setBranchId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [queues, setQueues] = useState<Queue[]>([]);
  const [error, setError] = useState("");

  const activeBranches = useMemo(() => branches.filter(branch => branch.active), [branches]);
  const selectedBranch: Branch | undefined = activeBranches.find(branch => branch.id === branchId) ?? activeBranches[0];
  const date = todayKey(business.timezone);

  useEffect(() => {
    if (selectedBranch && !branchId) setBranchId(selectedBranch.id);
  }, [branchId, selectedBranch]);

  useEffect(() => {
    if (!selectedBranch) return;
    const url = new URL("/barber/check-in", window.location.origin);
    url.searchParams.set("businessId", business.id);
    url.searchParams.set("branchId", selectedBranch.id);
    QRCode.toDataURL(url.toString(), { width: 360, margin: 2, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setError("QR tidak dapat dibuat."));
    getQueueForDate(selectedBranch.id, date).then(setQueues).catch(err => setError(err instanceof Error ? err.message : "Gagal memuat antrean."));
  }, [business.id, date, selectedBranch]);

  const waiting = queues.filter(queue => ["BOOKED", "WAITING", "CALLED", "IN_SERVICE"].includes(queue.status)).length;

  async function copyLink() {
    if (!selectedBranch) return;
    const url = new URL("/barber/check-in", window.location.origin);
    url.searchParams.set("businessId", business.id);
    url.searchParams.set("branchId", selectedBranch.id);
    await navigator.clipboard.writeText(url.toString());
  }

  function downloadQr() {
    if (!qrDataUrl || !selectedBranch) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `barber-online-checkin-${selectedBranch.code || selectedBranch.id}.png`;
    anchor.click();
  }

  if (!selectedBranch) return <Loading />;

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">ATTENDANCE + QR</div>
          <h1>Check-in Barber</h1>
          <p className="muted">QR berbeda untuk setiap cabang. Barber harus login untuk melakukan check-in.</p>
        </div>
        <QrCode size={30}/>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="panel attendance-toolbar">
        <label className="field"><span>Cabang</span><select value={selectedBranch.id} onChange={event => setBranchId(event.target.value)}>{activeBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <div className="attendance-summary"><strong>{waiting}</strong><span>antrean aktif hari ini</span></div>
      </div>

      <div className="qr-layout">
        <section className="panel qr-card">
          <div className="eyebrow">SCAN DI CABANG</div>
          <h2>{selectedBranch.name}</h2>
          {qrDataUrl ? <img className="attendance-qr" src={qrDataUrl} alt={`QR check-in ${selectedBranch.name}`} /> : <Loading />}
          <p className="muted">Tampilkan QR ini di area kasir atau meja barber. Hanya akun barber dari cabang ini yang dapat menggunakannya.</p>
          <div className="button-row">
            <button className="btn secondary" onClick={() => void copyLink()}><Copy size={16}/> Salin Link</button>
            <button className="btn primary" onClick={downloadQr}><Download size={16}/> Download QR</button>
          </div>
        </section>
        <section className="panel">
          <div className="eyebrow">ATURAN</div>
          <h2>Validasi Check-in</h2>
          <ul className="clean-list">
            <li>Barber wajib login terlebih dahulu.</li>
            <li>QR divalidasi terhadap bisnis dan cabang akun barber.</li>
            <li>Satu barber hanya memiliki satu attendance aktif per tanggal.</li>
            <li>Check-in tercatat dengan metode <strong>QR</strong>.</li>
            <li>Barber tidak dapat memulai layanan sebelum status attendance <strong>PRESENT</strong>.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
