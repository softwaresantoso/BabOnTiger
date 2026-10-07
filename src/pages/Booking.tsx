import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Scissors,
  UserRound,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import { ensureGuestCustomer } from "../services/auth";
import {
  getActiveBarbers,
  getActiveServices,
} from "../services/data";
import {
  createBooking,
  getAvailableSlots,
} from "../services/booking";

import type {
  Barber,
  Service,
} from "../types";

import {
  ErrorBox,
  Loading,
} from "../components";

import { todayKey } from "../lib/date";
import {
  validatePromoCode,
  formatIDR,
} from "../services/promo";

export default function Booking() {
  const { profile } =
    useAuth();

  const {
    business,
    branches,
    selectedBranchId,
    setSelectedBranchId,
  } = useBusiness();

  const nav =
    useNavigate();

  const [params] =
    useSearchParams();

  const [services, setServices] =
    useState<Service[]>([]);

  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [barberId, setBarberId] =
    useState("any");

  const [date, setDate] =
    useState(
      todayKey(
        business.timezone ||
          "Asia/Jakarta"
      )
    );

  const [time, setTime] =
    useState("");

  const [name, setName] =
    useState(
      profile?.name || ""
    );

  const [phone, setPhone] =
    useState(
      profile?.phone || ""
    );

  const [notes, setNotes] =
    useState("");

  const [slots, setSlots] =
    useState<string[]>([]);

  const [promoCode, setPromoCode] =
    useState("");

  const [promo, setPromo] =
    useState<{
      id: string;
      code?: string;
      discount: number;
      title: string;
    } | null>(null);

  const [promoBusy, setPromoBusy] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [error, setError] =
    useState("");

  const branchId =
    selectedBranchId;

  useEffect(() => {
    const requested =
      params.get("branch");

    if (
      requested &&
      branches.some(
        (branch) =>
          branch.id === requested
      )
    ) {
      setSelectedBranchId(
        requested
      );
    }
  }, [
    params,
    branches,
    setSelectedBranchId,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookingData() {
      try {
        setLoading(true);
        setError("");

        const [
          allServices,
          allBarbers,
        ] = await Promise.all([
          getActiveServices(),
          getActiveBarbers(),
        ]);

        if (cancelled) {
          return;
        }

        const branchServices =
          allServices.filter(
            (service) =>
              !service.branchId ||
              service.branchId ===
                branchId
          );

        const branchBarbers =
          allBarbers.filter(
            (barber) =>
              barber.active &&
              barber.branchId ===
                branchId
          );

        setServices(
          branchServices
        );

        setBarbers(
          branchBarbers
        );

        setSelectedIds(
          (previous) => {
            const valid =
              previous.filter(
                (id) =>
                  branchServices.some(
                    (service) =>
                      service.id ===
                      id
                  )
              );

            if (valid.length > 0) {
              return valid;
            }

            return branchServices[0]
              ? [
                  branchServices[0]
                    .id,
                ]
              : [];
          }
        );

        setBarberId("any");
        setTime("");
        setSlots([]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data booking."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (branchId) {
      loadBookingData();
    } else {
      setServices([]);
      setBarbers([]);
      setSelectedIds([]);
      setBarberId("any");
      setTime("");
      setSlots([]);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const selectedServices =
    useMemo(
      () =>
        services.filter(
          (service) =>
            selectedIds.includes(
              service.id
            )
        ),
      [
        services,
        selectedIds,
      ]
    );

  const totalDuration =
    selectedServices.reduce(
      (sum, service) =>
        sum +
        service.durationMinutes,
      0
    );

  const totalPrice =
    selectedServices.reduce(
      (sum, service) =>
        sum + service.price,
      0
    );

  const finalPrice =
    Math.max(
      0,
      totalPrice -
        (promo?.discount || 0)
    );

  const barber =
    useMemo(
      () =>
        barbers.find(
          (item) =>
            item.id === barberId
        ),
      [barbers, barberId]
    );

  const combinedService =
    useMemo<
      Service | undefined
    >(
      () =>
        selectedServices.length
          ? {
              ...selectedServices[0],
              name:
                selectedServices
                  .map(
                    (service) =>
                      service.name
                  )
                  .join(" + "),
              durationMinutes:
                totalDuration,
              price:
                totalPrice,
            }
          : undefined,
      [
        selectedServices,
        totalDuration,
        totalPrice,
      ]
    );

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (
        !combinedService ||
        !date ||
        !branchId
      ) {
        setSlots([]);
        return;
      }

      setTime("");
      setError("");
      setLoadingSlots(true);

      try {
        if (barberId === "any") {
          if (barbers.length === 0) {
            setSlots([]);
            return;
          }

          const all =
            await Promise.all(
              barbers.map(
                (item) =>
                  getAvailableSlots(
                    item,
                    combinedService,
                    date
                  )
              )
            );

          if (!cancelled) {
            setSlots(
              [
                ...new Set(
                  all.flat()
                ),
              ].sort()
            );
          }

          return;
        }

        if (!barber) {
          setSlots([]);
          return;
        }

        const available =
          await getAvailableSlots(
            barber,
            combinedService,
            date
          );

        if (!cancelled) {
          setSlots(
            available
          );
        }
      } catch (err) {
        if (!cancelled) {
          setSlots([]);

          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat slot jam."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [
    combinedService,
    barber,
    barberId,
    date,
    barbers,
    branchId,
  ]);

  function toggleService(
    id: string
  ) {
    setSelectedIds(
      (ids) =>
        ids.includes(id)
          ? ids.filter(
              (item) =>
                item !== id
            )
          : [...ids, id]
    );
  }

  async function applyPromo() {
    if (!profile) {
      setError(
        "Login diperlukan untuk menggunakan promo."
      );
      return;
    }

    if (
      !branchId ||
      !selectedServices.length
    ) {
      setError(
        "Pilih cabang dan layanan terlebih dahulu."
      );
      return;
    }

    setPromoBusy(true);
    setError("");

    try {
      const result =
        await validatePromoCode({
          code: promoCode,
          branchId,
          customerId:
            profile.uid,
          subtotal:
            totalPrice,
          serviceIds:
            selectedServices.map(
              (service) =>
                service.id
            ),
        });

      setPromo({
        id: result.promo.id,
        code:
          result.promo
            .promoCode,
        discount:
          result.discount,
        title:
          result.promo.title,
      });
    } catch (err) {
      setPromo(null);

      setError(
        err instanceof Error
          ? err.message
          : "Kode promo tidak dapat digunakan."
      );
    } finally {
      setPromoBusy(false);
    }
  }

  async function submit() {
    if (!branchId) {
      setError(
        "Pilih cabang terlebih dahulu."
      );
      return;
    }

    if (
      !selectedServices.length ||
      !time
    ) {
      setError(
        "Pilih minimal satu layanan dan jam."
      );
      return;
    }

    if (
      !name.trim() ||
      !phone.trim()
    ) {
      setError(
        "Nama dan nomor WhatsApp diperlukan."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const customer =
        profile ??
        (await ensureGuestCustomer(
          name.trim(),
          phone.trim()
        ));

      const result =
        await createBooking({
          customerId:
            customer.uid,
          customerName:
            name.trim(),
          customerPhone:
            phone.trim(),
          branchId,
          barber:
            barberId === "any"
              ? undefined
              : barber,
          services:
            selectedServices,
          date,
          startTime: time,
          notes,
          promo:
            profile && promo
              ? {
                  id: promo.id,
                  code:
                    promo.code,
                  discount:
                    promo.discount,
                }
              : undefined,
        });

      nav(
        `/booking/success/${result.id}?code=${encodeURIComponent(
          result.code
        )}&queue=${result.queueNumber}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Booking gagal."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container narrow booking-page">
      <div className="eyebrow">
        ONLINE BOOKING
      </div>

      <h1>
        Atur jadwalmu.
      </h1>

      <p className="lead">
        Pilih cabang, layanan,
        barber, tanggal, dan jam
        yang tersedia.
      </p>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      <div className="booking-grid">
        <section className="panel">
          <h3>
            <MapPin size={18} />
            1. Cabang
          </h3>

          <div className="choice-grid">
            {branches.map(
              (branch) => (
                <button
                  key={branch.id}
                  className={`choice ${
                    branchId ===
                    branch.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedBranchId(
                      branch.id
                    );
                    setSelectedIds(
                      []
                    );
                    setBarberId(
                      "any"
                    );
                    setTime("");
                    setSlots([]);
                  }}
                >
                  <b>
                    {branch.name}
                  </b>

                  <span>
                    {branch.address ||
                      "Alamat belum diatur"}
                  </span>
                </button>
              )
            )}
          </div>
        </section>

        <section className="panel">
          <h3>
            <Scissors size={18} />
            2. Layanan{" "}
            <small className="muted">
              ({selectedServices.length}{" "}
              dipilih)
            </small>
          </h3>

          <div className="choice-grid">
            {services.length === 0 ? (
              <div className="empty">
                Belum ada layanan aktif
                untuk cabang ini.
              </div>
            ) : (
              services.map(
                (service) => (
                  <button
                    type="button"
                    key={service.id}
                    className={`choice ${
                      selectedIds.includes(
                        service.id
                      )
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggleService(
                        service.id
                      )
                    }
                  >
                    <b>
                      {service.name}
                    </b>

                    <span>
                      {
                        service.durationMinutes
                      }{" "}
                      menit •{" "}
                      {formatIDR(
                        service.price
                      )}
                    </span>
                  </button>
                )
              )
            )}
          </div>
        </section>

        <section className="panel">
          <h3>
            <UserRound size={18} />
            3. Barber
          </h3>

          {barbers.length === 0 ? (
            <div className="empty">
              Belum ada barber aktif
              yang terdaftar pada
              cabang ini.
              <br />
              <small>
                Admin perlu mengatur
                cabang barber terlebih
                dahulu.
              </small>
            </div>
          ) : (
            <div className="choice-grid">
              <button
                className={`choice ${
                  barberId === "any"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setBarberId(
                    "any"
                  )
                }
              >
                <b>
                  Barber mana saja
                </b>

                <span>
                  Sistem memilih
                  barber yang
                  tersedia.
                </span>
              </button>

              {barbers.map(
                (item) => (
                  <button
                    key={item.id}
                    className={`choice ${
                      barberId ===
                      item.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setBarberId(
                        item.id
                      )
                    }
                  >
                    <b>
                      {item.name}
                    </b>

                    <span>
                      {item.specialties?.join(
                        " • "
                      ) ||
                        item.bio ||
                        "Barber profesional"}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <h3>
            <CalendarDays size={18} />
            4. Tanggal
          </h3>

          <input
            type="date"
            min={todayKey(
              business.timezone ||
                "Asia/Jakarta"
            )}
            value={date}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
          />
        </section>

        <section className="panel">
          <h3>
            <Clock3 size={18} />
            5. Jam
          </h3>

          {loadingSlots ? (
            <div className="empty">
              Memuat jam tersedia...
            </div>
          ) : slots.length ? (
            <div className="time-grid">
              {slots.map(
                (slot) => (
                  <button
                    key={slot}
                    className={`time ${
                      time === slot
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setTime(
                        slot
                      )
                    }
                  >
                    {slot}
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="empty">
              {!selectedServices.length
                ? "Pilih layanan terlebih dahulu."
                : barbers.length === 0
                ? "Belum ada barber aktif pada cabang ini."
                : barberId !== "any" &&
                  !barber
                ? "Pilih barber terlebih dahulu."
                : "Tidak ada slot tersedia. Pastikan barber sudah memiliki jadwal kerja pada tanggal tersebut."}
            </div>
          )}
        </section>

        {!profile && (
          <section className="panel">
            <h3>
              6. Data pelanggan
            </h3>

            <input
              placeholder="Nama lengkap"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />

            <input
              placeholder="Nomor WhatsApp"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
            />

            <small>
              Login tidak wajib.
              Akun tamu dibuat
              otomatis agar booking
              dapat dilacak.
            </small>
          </section>
        )}

        {profile && (
          <section className="panel">
            <h3>
              Promo
            </h3>

            <div className="form-grid">
              <input
                placeholder="Kode promo"
                value={
                  promoCode
                }
                onChange={(e) => {
                  setPromoCode(
                    e.target.value.toUpperCase()
                  );
                  setPromo(null);
                }}
              />

              <button
                className="btn secondary"
                disabled={
                  promoBusy ||
                  !promoCode.trim() ||
                  !selectedServices.length
                }
                onClick={
                  applyPromo
                }
              >
                {promoBusy
                  ? "Memeriksa..."
                  : "Gunakan Promo"}
              </button>
            </div>

            {promo ? (
              <p className="success-note">
                {promo.title} •
                Hemat{" "}
                {formatIDR(
                  promo.discount
                )}{" "}
                <button
                  className="link-button"
                  onClick={() =>
                    setPromo(
                      null
                    )
                  }
                >
                  Hapus
                </button>
              </p>
            ) : (
              <small>
                Promo hanya dapat
                digunakan oleh
                pelanggan yang login.
              </small>
            )}
          </section>
        )}

        <section className="panel">
          <h3>
            Catatan
          </h3>

          <textarea
            rows={3}
            placeholder="Opsional, mis. model rambut..."
            value={notes}
            onChange={(e) =>
              setNotes(
                e.target.value
              )
            }
          />
        </section>

        <section className="summary panel">
          <div>
            <span>
              Cabang
            </span>

            <b>
              {branches.find(
                (branch) =>
                  branch.id ===
                  branchId
              )?.name || "-"}
            </b>
          </div>

          <div>
            <span>
              Layanan
            </span>

            <b>
              {selectedServices
                .map(
                  (service) =>
                    service.name
                )
                .join(", ") ||
                "-"}
            </b>
          </div>

          <div>
            <span>
              Durasi
            </span>

            <b>
              {totalDuration
                ? `${totalDuration} menit`
                : "-"}
            </b>
          </div>

          <div>
            <span>
              Barber
            </span>

            <b>
              {barberId === "any"
                ? "Barber mana saja"
                : barber?.name ||
                  "-"}
            </b>
          </div>

          <div>
            <span>
              Jadwal
            </span>

            <b>
              {date}{" "}
              {time || "-"}
            </b>
          </div>

          <div>
            <span>
              Subtotal
            </span>

            <b>
              {selectedServices.length
                ? formatIDR(
                    totalPrice
                  )
                : "-"}
            </b>
          </div>

          <div>
            <span>
              Diskon promo
            </span>

            <b>
              -
              {promo
                ? formatIDR(
                    promo.discount
                  )
                : formatIDR(0)}
            </b>
          </div>

          <div>
            <span>
              Total
            </span>

            <strong>
              {selectedServices.length
                ? formatIDR(
                    finalPrice
                  )
                : "-"}
            </strong>
          </div>

          <button
            className="btn primary big full"
            disabled={
              !time ||
              busy ||
              !branchId ||
              !selectedServices.length
            }
            onClick={submit}
          >
            {busy
              ? "Memproses..."
              : "Konfirmasi Booking"}
          </button>
        </section>
      </div>
    </div>
  );
}