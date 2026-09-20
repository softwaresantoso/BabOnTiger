import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  Phone,
  Scissors,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { Empty, ErrorBox, Loading } from "../components";
import { getBookingsForDate } from "../services/data";
import {
  callQueue,
  claimQueueForBarber,
  completeQueue,
  getQueueForDate,
  markNoShow,
  startQueueService,
} from "../services/queue";
import { checkInBarber, checkOutBarber, getTodayAttendance } from "../services/attendance";
import { formatDateTime, todayKey } from "../lib/date";
import type { Attendance, Booking, Queue } from "../types";

function QueueStatus({ status }: { status: Queue["status"] }) {
  return <span className={`status ${status}`}>{status.replaceAll("_", " ")}</span>;
}

export default function BarberDashboard() {
  const { profile } = useAuth();
  const { business } = useBusiness();
  const branchId = profile?.branchId;
  const barberId = profile?.barberId;
  const date = todayKey(business.timezone);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "MINE">("ALL");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!branchId || !barberId) {
      setLoading(false);
      return;
    }
    try {
      setError("");
      const [nextQueues, nextBookings, nextAttendance] = await Promise.all([
        getQueueForDate(branchId, date),
        getBookingsForDate(barberId, date),
        getTodayAttendance(barberId, date),
      ]);
      setQueues(nextQueues);
      setBookings(nextBookings);
      setAttendance(nextAttendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat workspace barber.");
    } finally {
      setLoading(false);
    }
  }, [barberId, branchId, date]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleQueues = useMemo(
    () => filter === "MINE" ? queues.filter(q => q.barberId === barberId) : queues,
    [barberId, filter, queues]
  );

  const mine = useMemo(() => queues.filter(q => q.barberId === barberId), [barberId, queues]);
  const waiting = queues.filter(q => q.status === "WAITING" || q.status === "BOOKED").length;
  const inService = queues.filter(q => q.status === "IN_SERVICE").length;
  const completed = queues.filter(q => q.status === "COMPLETED").length;
  const myCompleted = mine.filter(q => q.status === "COMPLETED").length;
  const myNoShow = mine.filter(q => q.status === "NO_SHOW").length;

  async function runQueueAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      setError("");
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi antrean gagal.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClaim(queue: Queue) {
    if (!barberId || !profile) return;
    await runQueueAction(queue.id, () => claimQueueForBarber(queue.id, barberId, profile.name));
  }

  async function handleAttendance() {
    if (!barberId || !branchId || !profile) return;
    setAttendanceBusy(true);
    try {
      setError("");
      if (!attendance) {
        await checkInBarber({ barberId, barberName: profile.name, branchId, date, method: "MANUAL" });
      } else if (attendance.status === "PRESENT") {
        await checkOutBarber(barberId, date);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi attendance gagal.");
    } finally {
      setAttendanceBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (!profile?.branchId || !profile?.barberId) {
    return <div><ErrorBox message="Akun barber belum terhubung ke branch dan barber profile. Minta Owner melengkapi data akun Anda." /></div>;
  }

  const attendancePresent = attendance?.status === "PRESENT";

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">BARBER WORKSPACE</div>
          <h1>Halo, {profile.name}</h1>
          <p className="muted">Operasional barber untuk {date}.</p>
        </div>
        <button className={`btn ${attendancePresent ? "secondary" : "primary"}`} onClick={handleAttendance} disabled={attendanceBusy || attendance?.status === "COMPLETED"}>
          {attendancePresent ? <LogOut size={16} /> : <LogIn size={16} />}
          {attendanceBusy ? "Memproses..." : attendancePresent ? "Check-out" : attendance?.status === "COMPLETED" ? "Shift Selesai" : "Check-in"}
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="barber-attendance panel">
        <div>
          <div className="eyebrow">ATTENDANCE</div>
          <strong>{attendancePresent ? "Anda sedang aktif" : attendance?.status === "COMPLETED" ? "Shift hari ini sudah selesai" : "Belum check-in"}</strong>
          <p className="muted">
            {attendance?.checkInAt ? `Masuk ${formatDateTime(attendance.checkInAt, business.timezone)}` : "Check-in manual tersedia pada Step 7. QR check-in menjadi pengembangan berikutnya."}
            {attendance?.checkOutAt ? ` • Keluar ${formatDateTime(attendance.checkOutAt, business.timezone)}` : ""}
          </p>
        </div>
        <UserRoundCheck size={28} />
      </div>

      <div className="stat-grid">
        <div className="stat"><CalendarDays size={20}/><span>Booking hari ini</span><strong>{bookings.length}</strong></div>
        <div className="stat"><Clock3 size={20}/><span>Antrean menunggu</span><strong>{waiting}</strong></div>
        <div className="stat"><Scissors size={20}/><span>Sedang dilayani</span><strong>{inService}</strong></div>
        <div className="stat"><CheckCircle2 size={20}/><span>Selesai saya</span><strong>{myCompleted}</strong></div>
      </div>

      <div className="barber-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">QUEUE CONTROL</div>
              <h2>Antrean Cabang</h2>
            </div>
            <div className="segmented">
              <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>Semua</button>
              <button className={filter === "MINE" ? "active" : ""} onClick={() => setFilter("MINE")}>Saya</button>
            </div>
          </div>

          {visibleQueues.length === 0 ? <Empty>Belum ada antrean yang sesuai filter.</Empty> : (
            <div className="barber-queue-list">
              {visibleQueues.map(queue => {
                const mineQueue = queue.barberId === barberId;
                const busy = busyId === queue.id;
                return (
                  <div className={`barber-queue-card ${mineQueue ? "mine" : ""}`} key={queue.id}>
                    <div className="queue-number">{queue.queueNumber}</div>
                    <div className="queue-main">
                      <div className="card-top">
                        <QueueStatus status={queue.status} />
                        {queue.source && <small>{queue.source === "WALK_IN" ? "Walk-in" : "Online"}</small>}
                      </div>
                      <strong>{queue.customerName}</strong>
                      <span>{queue.serviceName}{queue.barberName ? ` • ${queue.barberName}` : " • Belum ada barber"}</span>
                      {queue.customerPhone && <a href={`tel:${queue.customerPhone}`}><Phone size={13}/> {queue.customerPhone}</a>}
                    </div>
                    <div className="queue-actions">
                      {!mineQueue && !queue.barberId && !["COMPLETED", "NO_SHOW", "CANCELLED"].includes(queue.status) && (
                        <button className="btn small secondary" disabled={busy} onClick={() => handleClaim(queue)}>
                          <UserRound size={14}/> Ambil
                        </button>
                      )}
                      {mineQueue && ["BOOKED", "WAITING"].includes(queue.status) && (
                        <button className="btn small secondary" disabled={busy} onClick={() => runQueueAction(queue.id, () => callQueue(queue.id))}>Panggil</button>
                      )}
                      {mineQueue && queue.status === "CALLED" && (
                        <button className="btn small primary" disabled={busy} onClick={() => runQueueAction(queue.id, () => startQueueService(queue.id))}>Mulai</button>
                      )}
                      {mineQueue && queue.status === "IN_SERVICE" && (
                        <button className="btn small primary" disabled={busy} onClick={() => runQueueAction(queue.id, () => completeQueue(queue.id))}>Selesai</button>
                      )}
                      {mineQueue && queue.status === "CALLED" && (
                        <button className="btn small danger" disabled={busy} onClick={() => runQueueAction(queue.id, () => markNoShow(queue.id))}>No-show</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="eyebrow">TODAY SUMMARY</div>
          <h2>Ringkasan Saya</h2>
          <div className="summary-list">
            <div><span>Booking terjadwal</span><strong>{bookings.length}</strong></div>
            <div><span>Antrean saya</span><strong>{mine.length}</strong></div>
            <div><span>Selesai</span><strong>{myCompleted}</strong></div>
            <div><span>No-show</span><strong>{myNoShow}</strong></div>
            <div><span>Total selesai cabang</span><strong>{completed}</strong></div>
          </div>
          <div className="alert info">
            Pendapatan barber akan ditampilkan setelah modul transaksi dan laporan pada Step 9–12.
          </div>
        </aside>
      </div>

      <section className="panel barber-bookings-panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">MY BOOKINGS</div>
            <h2>Booking Terjadwal</h2>
          </div>
          <span className="muted">{bookings.length} booking</span>
        </div>
        {bookings.length === 0 ? <Empty>Tidak ada booking untuk Anda hari ini.</Empty> : (
          <div className="barber-booking-table">
            {bookings.map(booking => (
              <div className="barber-booking-row" key={booking.id}>
                <strong>{booking.startTime}</strong>
                <div><b>{booking.customerName}</b><span>{booking.serviceName}</span></div>
                <div><span>{booking.code}</span><small>{booking.source === "WALK_IN" ? "Walk-in" : "Online"}</small></div>
                <QueueStatus status={booking.status === "CHECKED_IN" ? "WAITING" : booking.status === "IN_SERVICE" ? "IN_SERVICE" : booking.status === "COMPLETED" ? "COMPLETED" : booking.status === "NO_SHOW" ? "NO_SHOW" : booking.status === "CANCELLED" ? "CANCELLED" : "BOOKED"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
