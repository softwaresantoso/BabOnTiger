import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarDays, CheckCircle2, Clock3, PlayCircle, SkipForward, UserRound, Users } from "lucide-react";
import { Loading, Empty, ErrorBox } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { getAllBarbers, getAllServices } from "../services/data";
import { getOwnerDailyData } from "../services/owner";
import { callQueue, completeQueue, markNoShow, startQueueService } from "../services/queue";
import type { Booking, Queue } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

export default function OwnerDashboard() {
  const { selectedBranch, selectedBranchId, branches } = useBusiness();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [barbers, setBarbers] = useState(0);
  const [services, setServices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!selectedBranchId) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [daily, allBarbers, allServices] = await Promise.all([
        getOwnerDailyData(selectedBranchId, today()),
        getAllBarbers(),
        getAllServices(),
      ]);
      setBookings(daily.bookings);
      setQueues(daily.queues);
      setBarbers(allBarbers.filter(b => b.branchId === selectedBranchId).length);
      setServices(allServices.filter(s => !s.branchId || s.branchId === selectedBranchId).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard owner.");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const activeQueue = useMemo(
    () => queues.filter(q => ["BOOKED", "WAITING", "CALLED", "IN_SERVICE"].includes(q.status)),
    [queues]
  );
  const nextQueue = activeQueue.find(q => q.status === "CALLED") ?? activeQueue.find(q => q.status === "WAITING") ?? activeQueue.find(q => q.status === "BOOKED");

  async function action(queue: Queue, type: "call" | "start" | "complete" | "no-show") {
    setBusyId(queue.id);
    setError("");
    try {
      if (type === "call") await callQueue(queue.id);
      if (type === "start") await startQueueService(queue.id);
      if (type === "complete") await completeQueue(queue.id);
      if (type === "no-show") await markNoShow(queue.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi antrean gagal.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading />;
  if (!selectedBranchId) return <Empty>Belum ada cabang aktif. Tambahkan cabang terlebih dahulu.</Empty>;

  const waiting = queues.filter(q => q.status === "WAITING" || q.status === "BOOKED").length;
  const inService = queues.filter(q => q.status === "IN_SERVICE").length;
  const completed = queues.filter(q => q.status === "COMPLETED").length;
  const noShow = queues.filter(q => q.status === "NO_SHOW").length;

  return <div>
    <div className="section-head">
      <div>
        <div className="eyebrow">CONTROL CENTER</div>
        <h1>Dashboard Owner</h1>
        <p className="muted">{selectedBranch?.name ?? "Cabang"} • {today()}</p>
      </div>
      <div className="hero-actions">
        <Link className="btn secondary" to={selectedBranchId ? `/queue/${selectedBranchId}` : "/"}>Layar Antrean</Link>
        <Link className="btn primary" to="/owner/bookings">Kelola Booking</Link>
      </div>
    </div>

    {error && <ErrorBox message={error} />}

    <div className="stat-grid">
      <Stat icon={CalendarDays} label="Booking hari ini" value={bookings.length} />
      <Stat icon={Clock3} label="Menunggu" value={waiting} />
      <Stat icon={PlayCircle} label="Sedang dilayani" value={inService} />
      <Stat icon={CheckCircle2} label="Selesai" value={completed} />
    </div>

    <div className="stat-grid">
      <Stat icon={UserRound} label="Barber aktif" value={barbers} />
      <Stat icon={Activity} label="Layanan" value={services} />
      <Stat icon={SkipForward} label="No-show" value={noShow} />
      <Stat icon={Users} label="Cabang aktif" value={branches.length} />
    </div>

    <div className="owner-grid">
      <section className="panel">
        <div className="panel-title"><div><div className="eyebrow">QUEUE CONTROL</div><h2>Antrean aktif</h2></div><span className="muted">Auto-refresh 15 detik</span></div>
        {nextQueue && <div className="queue-highlight owner-current"><small>NEXT / CURRENT</small><strong>#{nextQueue.queueNumber}</strong><b>{nextQueue.customerName}</b><span>{nextQueue.serviceName} • {nextQueue.barberName || "Barber mana saja"}</span></div>}
        {activeQueue.length === 0 ? <Empty>Belum ada antrean aktif hari ini.</Empty> : <div className="queue-board owner-queue-list">{activeQueue.map(q => <OwnerQueueRow key={q.id} queue={q} busy={busyId === q.id} onAction={action} />)}</div>}
      </section>

      <section className="panel">
        <div className="panel-title"><div><div className="eyebrow">TODAY</div><h2>Booking hari ini</h2></div><Link to="/owner/bookings">Lihat semua →</Link></div>
        {bookings.length === 0 ? <Empty>Belum ada booking hari ini.</Empty> : <div className="cards">{bookings.slice(0, 8).map(b => <div className="mini-card" key={b.id}><div className="avatar">{b.customerName.charAt(0).toUpperCase()}</div><div className="grow"><b>{b.customerName}</b><p>{b.serviceName} • {b.barberName || "Barber mana saja"}</p><span>{b.startTime}–{b.endTime} • {b.code}</span></div><span className={`status ${b.status}`}>{b.status}</span></div>)}</div>}
      </section>
    </div>
  </div>;
}

function OwnerQueueRow({ queue, busy, onAction }: { queue: Queue; busy: boolean; onAction: (queue: Queue, type: "call" | "start" | "complete" | "no-show") => void }) {
  return <div className={`queue-card ${queue.status}`}>
    <strong>#{queue.queueNumber}</strong>
    <div><b>{queue.customerName}</b><span>{queue.serviceName} • {queue.barberName || "Barber mana saja"}</span><span>{queue.status}</span></div>
    <div className="queue-actions">
      {queue.status === "BOOKED" || queue.status === "WAITING" ? <button className="btn small primary" disabled={busy} onClick={() => onAction(queue, "call")}>Panggil</button> : null}
      {queue.status === "CALLED" ? <button className="btn small primary" disabled={busy} onClick={() => onAction(queue, "start")}>Mulai</button> : null}
      {queue.status === "IN_SERVICE" ? <button className="btn small primary" disabled={busy} onClick={() => onAction(queue, "complete")}>Selesai</button> : null}
      {(queue.status === "BOOKED" || queue.status === "WAITING" || queue.status === "CALLED") ? <button className="btn small danger" disabled={busy} onClick={() => onAction(queue, "no-show")}>No-show</button> : null}
    </div>
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: number }) {
  return <div className="stat"><Icon size={20} /><span>{label}</span><strong>{value}</strong></div>;
}
