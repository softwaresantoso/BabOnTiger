import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  Empty,
  ErrorBox,
  Loading,
} from "../components";

import {
  getActiveBarbers,
  getSchedules,
  saveSchedule,
} from "../services/data";

import { useBusiness } from "../context/BusinessContext";

import type {
  Barber,
  Schedule,
} from "../types";

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

type ScheduleForm = {
  barberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  active: boolean;
};

const emptyForm: ScheduleForm = {
  barberId: "",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "17:00",
  breakStart: "",
  breakEnd: "",
  active: true,
};

function dayLabel(dayOfWeek: number) {
  return (
    DAYS.find(
      (day) => day.value === dayOfWeek
    )?.label || "-"
  );
}

export default function OwnerSchedules() {
  const {
    business,
    branches,
  } = useBusiness();

  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<ScheduleForm>(
      emptyForm
    );

  const [error, setError] =
    useState("");

  const [filterBarberId, setFilterBarberId] =
    useState("ALL");

  async function load() {
    try {
      setError("");
      setLoading(true);

      const [
        barberData,
        scheduleData,
      ] = await Promise.all([
        getActiveBarbers(),
        getSchedules(),
      ]);

      setBarbers(barberData);
      setSchedules(scheduleData);

      if (
        !form.barberId &&
        barberData.length > 0
      ) {
        setForm((current) => ({
          ...current,
          barberId: barberData[0].id,
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat jadwal barber."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      barberId:
        barbers[0]?.id || "",
    });

    setError("");
  }

  function startEdit(
    schedule: Schedule
  ) {
    setEditingId(schedule.id);

    setForm({
      barberId: schedule.barberId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakStart:
        schedule.breakStart || "",
      breakEnd:
        schedule.breakEnd || "",
      active:
        schedule.active !== false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit() {
    setError("");

    if (!form.barberId) {
      setError(
        "Barber wajib dipilih."
      );
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError(
        "Jam mulai dan jam selesai wajib diisi."
      );
      return;
    }

    if (
      form.startTime >=
      form.endTime
    ) {
      setError(
        "Jam selesai harus lebih besar dari jam mulai."
      );
      return;
    }

    if (
      form.breakStart &&
      form.breakEnd &&
      form.breakStart >=
        form.breakEnd
    ) {
      setError(
        "Jam selesai istirahat harus lebih besar dari jam mulai istirahat."
      );
      return;
    }

    if (
      form.breakStart &&
      (
        form.breakStart <=
          form.startTime ||
        form.breakStart >=
          form.endTime
      )
    ) {
      setError(
        "Jam mulai istirahat harus berada di dalam jam kerja."
      );
      return;
    }

    if (
      form.breakEnd &&
      (
        form.breakEnd <=
          form.startTime ||
        form.breakEnd >=
          form.endTime
      )
    ) {
      setError(
        "Jam selesai istirahat harus berada di dalam jam kerja."
      );
      return;
    }

    try {
      setSaving(true);

      const barber =
        barbers.find(
          (item) =>
            item.id ===
            form.barberId
        );

      if (!barber) {
        throw new Error(
          "Barber tidak ditemukan."
        );
      }

      const payload: Omit<
        Schedule,
        "id"
      > = {
        barberId:
          barber.id,
        branchId:
          barber.branchId,
        dayOfWeek:
          form.dayOfWeek,
        startTime:
          form.startTime,
        endTime:
          form.endTime,
        breakStart:
          form.breakStart ||
          undefined,
        breakEnd:
          form.breakEnd ||
          undefined,
        active:
          form.active,
      };

      await saveSchedule(
        payload,
        editingId || undefined
      );

      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan jadwal."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(
    schedule: Schedule
  ) {
    try {
      setError("");

      await saveSchedule(
        {
          barberId:
            schedule.barberId,
          branchId:
            schedule.branchId,
          dayOfWeek:
            schedule.dayOfWeek,
          startTime:
            schedule.startTime,
          endTime:
            schedule.endTime,
          breakStart:
            schedule.breakStart,
          breakEnd:
            schedule.breakEnd,
          active:
            !schedule.active,
        },
        schedule.id
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status jadwal."
      );
    }
  }

  const filteredSchedules =
    useMemo(() => {
      const items =
        filterBarberId === "ALL"
          ? schedules
          : schedules.filter(
              (item) =>
                item.barberId ===
                filterBarberId
            );

      return [...items].sort(
        (a, b) => {
          const barberA =
            barbers.find(
              (item) =>
                item.id ===
                a.barberId
            )?.name || "";

          const barberB =
            barbers.find(
              (item) =>
                item.id ===
                b.barberId
            )?.name || "";

          return (
            barberA.localeCompare(
              barberB
            ) ||
            a.dayOfWeek -
              b.dayOfWeek ||
            a.startTime.localeCompare(
              b.startTime
            )
          );
        }
      );
    }, [
      schedules,
      filterBarberId,
      barbers,
    ]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            BARBER SCHEDULE
          </div>

          <h1>
            Jadwal Barber
          </h1>

          <p className="muted">
            Atur jam kerja mingguan setiap barber.
            Jadwal ini digunakan sistem untuk
            menentukan slot booking pelanggan.
          </p>
        </div>

        <button
          type="button"
          className="btn secondary"
          onClick={load}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <ErrorBox message={error} />
      )}

      <div className="owner-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">
                {editingId
                  ? "EDIT SCHEDULE"
                  : "NEW SCHEDULE"}
              </div>

              <h2>
                {editingId
                  ? "Edit Jadwal"
                  : "Tambah Jadwal"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="btn ghost"
                onClick={
                  resetForm
                }
              >
                <X size={16} />
                Batal
              </button>
            )}
          </div>

          {barbers.length === 0 ? (
            <Empty>
              Belum ada barber aktif.
              Tambahkan barber terlebih dahulu.
            </Empty>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  Barber
                  <select
                    value={
                      form.barberId
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          barberId:
                            event.target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Pilih barber
                    </option>

                    {barbers.map(
                      (barber) => (
                        <option
                          key={
                            barber.id
                          }
                          value={
                            barber.id
                          }
                        >
                          {barber.name}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Hari
                  <select
                    value={
                      form.dayOfWeek
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          dayOfWeek:
                            Number(
                              event.target
                                .value
                            ),
                        })
                      )
                    }
                  >
                    {DAYS.map(
                      (day) => (
                        <option
                          key={
                            day.value
                          }
                          value={
                            day.value
                          }
                        >
                          {day.label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Jam Mulai
                  <input
                    type="time"
                    value={
                      form.startTime
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          startTime:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Jam Selesai
                  <input
                    type="time"
                    value={
                      form.endTime
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          endTime:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Mulai Istirahat
                  <input
                    type="time"
                    value={
                      form.breakStart
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          breakStart:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label>
                  Selesai Istirahat
                  <input
                    type="time"
                    value={
                      form.breakEnd
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          breakEnd:
                            event.target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        active:
                          event.target
                            .checked,
                      })
                    )
                  }
                />

                Jadwal aktif
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn primary"
                  disabled={saving}
                  onClick={
                    handleSubmit
                  }
                >
                  {editingId ? (
                    <Save size={16} />
                  ) : (
                    <Plus size={16} />
                  )}

                  {saving
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Tambah Jadwal"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={
                      resetForm
                    }
                  >
                    Batal
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">
                FILTER
              </div>

              <h2>
                Jadwal Mingguan
              </h2>
            </div>

            <CalendarDays
              size={20}
            />
          </div>

          <label>
            Tampilkan Barber
            <select
              value={
                filterBarberId
              }
              onChange={(event) =>
                setFilterBarberId(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                Semua Barber
              </option>

              {barbers.map(
                (barber) => (
                  <option
                    key={
                      barber.id
                    }
                    value={
                      barber.id
                    }
                  >
                    {barber.name}
                  </option>
                )
              )}
            </select>
          </label>

          {filteredSchedules.length ===
          0 ? (
            <Empty>
              Belum ada jadwal kerja.
              Tambahkan jadwal barber
              pada form di sebelah kiri.
            </Empty>
          ) : (
            <div
              className="cards"
              style={{
                marginTop: 16,
              }}
            >
              {filteredSchedules.map(
                (schedule) => {
                  const barber =
                    barbers.find(
                      (item) =>
                        item.id ===
                        schedule.barberId
                    );

                  const branch =
                    branches.find(
                      (item) =>
                        item.id ===
                        barber?.branchId
                    );

                  return (
                    <div
                      className="mini-card"
                      key={
                        schedule.id
                      }
                    >
                      <div className="avatar">
                        {(
                          barber?.name ||
                          "B"
                        )
                          .slice(
                            0,
                            1
                          )
                          .toUpperCase()}
                      </div>

                      <div className="grow">
                        <b>
                          {barber?.name ||
                            "Barber"}
                        </b>

                        <p>
                          {dayLabel(
                            schedule.dayOfWeek
                          )}{" "}
                          •{" "}
                          {
                            schedule.startTime
                          }{" "}
                          –{" "}
                          {
                            schedule.endTime
                          }
                        </p>

                        <span>
                          {branch?.name ||
                            "Cabang belum ditentukan"}

                          {schedule.breakStart &&
                          schedule.breakEnd
                            ? ` • Istirahat ${schedule.breakStart}–${schedule.breakEnd}`
                            : ""}
                        </span>

                        <small
                          style={{
                            display:
                              "block",
                            marginTop: 4,
                          }}
                        >
                          Status:{" "}
                          {schedule.active
                            ? "Aktif"
                            : "Nonaktif"}
                        </small>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          flexWrap:
                            "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() =>
                            startEdit(
                              schedule
                            )
                          }
                        >
                          <Edit3
                            size={15}
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          className={`btn ${
                            schedule.active
                              ? "danger"
                              : "secondary"
                          }`}
                          onClick={() =>
                            handleToggle(
                              schedule
                            )
                          }
                        >
                          {schedule.active
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                        </button>

                        <button
                          type="button"
                          className="btn ghost"
                          disabled
                          title="Jadwal dinonaktifkan, bukan dihapus."
                        >
                          <Trash2
                            size={15}
                          />
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>

      <section
        className="panel"
        style={{
          marginTop: 16,
        }}
      >
        <div className="panel-title">
          <div>
            <div className="eyebrow">
              BOOKING ENGINE
            </div>

            <h2>
              Cara Kerja Jadwal
            </h2>
          </div>
        </div>

        <div className="feature-grid">
          <div className="feature">
            <CalendarDays size={20} />
            <h3>
              Jadwal Mingguan
            </h3>
            <p>
              Atur hari dan jam kerja
              masing-masing barber.
            </p>
          </div>

          <div className="feature">
            <CalendarDays size={20} />
            <h3>
              Slot Otomatis
            </h3>
            <p>
              Booking pelanggan akan
              mengambil slot berdasarkan
              jadwal barber.
            </p>
          </div>

          <div className="feature">
            <CalendarDays size={20} />
            <h3>
              Jam Istirahat
            </h3>
            <p>
              Slot pada periode istirahat
              tidak akan ditawarkan.
            </p>
          </div>
        </div>
      </section>

      <p
        className="muted"
        style={{
          marginTop: 16,
        }}
      >
        {business.name} • Jadwal barber
      </p>
    </div>
  );
}