import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db, BUSINESS_ID } from "../lib/firebase";
import { getSchedules, getSpecialSchedule } from "./data";
import { createQueueEntry } from "./queue";
import type { Booking, Barber, Service } from "../types";

const SLOT = 15;

function toMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(
    value % 60
  ).padStart(2, "0")}`;
}

function dayOfWeek(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function lockId(barberId: string, date: string, time: string) {
  return `${date}_${barberId}_${time.replace(":", "")}`;
}

function lockRef(barberId: string, date: string, time: string) {
  return doc(
    db,
    "businesses",
    BUSINESS_ID,
    "bookingLocks",
    lockId(barberId, date, time)
  );
}

export function endTime(startTime: string, durationMinutes: number) {
  return fromMinutes(toMinutes(startTime) + durationMinutes);
}

async function scheduleWindow(barber: Barber, date: string) {
  const weekly = (await getSchedules(barber.id)).filter(
    (s) => s.active && s.dayOfWeek === dayOfWeek(date)
  );

  const special = await getSpecialSchedule(barber.id, date);

  if (special?.type === "CLOSED") {
    return null;
  }

  const source = special ?? weekly[0];

  if (!source || !source.startTime || !source.endTime) {
    return null;
  }

  return {
    start: toMinutes(source.startTime),
    end: toMinutes(source.endTime),
    breakStart: source.breakStart
      ? toMinutes(source.breakStart)
      : null,
    breakEnd: source.breakEnd
      ? toMinutes(source.breakEnd)
      : null,
  };
}

async function occupiedSlots(barberId: string, date: string) {
  const locks = await getDocs(
    query(
      collection(db, "businesses", BUSINESS_ID, "bookingLocks"),
      where("barberId", "==", barberId),
      where("date", "==", date)
    )
  );

  return new Set(
    locks.docs.map((d) => d.data().slotTime as string)
  );
}

export async function getAvailableSlots(
  barber: Barber,
  service: Service,
  date: string
): Promise<string[]> {
  const window = await scheduleWindow(barber, date);

  if (!window) {
    return [];
  }

  const occupied = await occupiedSlots(barber.id, date);

  const now = new Date();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const currentMinutes =
    Number(parts.find((x) => x.type === "hour")?.value || 0) * 60 +
    Number(parts.find((x) => x.type === "minute")?.value || 0) +
    30;

  const result: string[] = [];

  for (
    let t = window.start;
    t + service.durationMinutes <= window.end;
    t += SLOT
  ) {
    const candidateEnd = t + service.durationMinutes;

    if (date === today && t < currentMinutes) {
      continue;
    }

    if (
      window.breakStart !== null &&
      window.breakEnd !== null &&
      t < window.breakEnd &&
      candidateEnd > window.breakStart
    ) {
      continue;
    }

    let free = true;

    for (let s = t; s < candidateEnd; s += SLOT) {
      if (occupied.has(fromMinutes(s))) {
        free = false;
        break;
      }
    }

    if (free) {
      result.push(fromMinutes(t));
    }
  }

  return result;
}

export async function getAvailableBarbers(
  barbers: Barber[],
  service: Service,
  date: string,
  startTime: string
) {
  const matches: Barber[] = [];

  for (const barber of barbers.filter(
    (b) =>
      b.active &&
      (!service.barberIds?.length ||
        service.barberIds.includes(b.id))
  )) {
    const availableSlots = await getAvailableSlots(
      barber,
      service,
      date
    );

    if (availableSlots.includes(startTime)) {
      matches.push(barber);
    }
  }

  return matches;
}

export async function createBooking(args: {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  branchId: string;
  barber?: Barber;
  services: Service[];
  date: string;
  startTime: string;
  notes?: string;
  promo?: {
    id: string;
    code?: string;
    discount: number;
  };
}) {
  if (!args.services.length) {
    throw new Error("Pilih minimal satu layanan.");
  }

  const totalDuration = args.services.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  );

  const totalPrice = args.services.reduce(
    (sum, service) => sum + service.price,
    0
  );

  const selectedIds = new Set(
    args.services.flatMap((service) =>
      service.barberIds?.length ? service.barberIds : []
    )
  );

  let candidates = args.barber
    ? [args.barber]
    : [];

  if (!candidates.length) {
    const snap = await getDocs(
      query(
        collection(
          db,
          "businesses",
          BUSINESS_ID,
          "barbers"
        ),
        where("active", "==", true)
      )
    );

    candidates = snap.docs
      .map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Barber
      )
      .filter(
        (barber) =>
          !barber.branchId ||
          barber.branchId === args.branchId
      );
  }

  candidates = candidates.filter(
    (barber) =>
      !selectedIds.size ||
      selectedIds.has(barber.id)
  );

  const availableCandidates: Barber[] = [];

  const combinedService: Service = {
    ...args.services[0],
    name: args.services
      .map((service) => service.name)
      .join(" + "),
    durationMinutes: totalDuration,
    price: totalPrice,
  };

  for (const barber of candidates) {
    const availableSlots = await getAvailableSlots(
      barber,
      combinedService,
      args.date
    );

    if (availableSlots.includes(args.startTime)) {
      availableCandidates.push(barber);
    }
  }

  if (!availableCandidates.length) {
    throw new Error(
      "Tidak ada barber yang tersedia pada slot tersebut. Silakan pilih jam atau barber lain."
    );
  }

  const bookingRef = doc(
    collection(
      db,
      "businesses",
      BUSINESS_ID,
      "bookings"
    )
  );

  const end = endTime(
    args.startTime,
    totalDuration
  );

  const code = `BO-${args.date.replaceAll(
    "-",
    ""
  )}-${args.startTime.replace(
    ":",
    ""
  )}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const selectedBarber =
    availableCandidates[0];

  await runTransaction(db, async (tx) => {
    const slotTimes: string[] = [];

    for (
      let s = toMinutes(args.startTime);
      s < toMinutes(end);
      s += SLOT
    ) {
      slotTimes.push(fromMinutes(s));
    }

    const refs = slotTimes.map((slotTime) =>
      lockRef(
        selectedBarber.id,
        args.date,
        slotTime
      )
    );

    const snaps = [];

    for (const ref of refs) {
      snaps.push(await tx.get(ref));
    }

    if (snaps.some((snap) => snap.exists())) {
      throw new Error(
        "Slot baru saja diambil pelanggan lain. Silakan pilih waktu lain."
      );
    }

    /*
     * Build booking tanpa menyimpan undefined.
     */
    const booking: Booking = {
      id: bookingRef.id,
      code,

      businessId: BUSINESS_ID,
      branchId: args.branchId,

      customerId: args.customerId,
      customerName: args.customerName,

      ...(args.customerPhone
        ? {
            customerPhone:
              args.customerPhone,
          }
        : {}),

      barberId: selectedBarber.id,
      barberName: selectedBarber.name,

      serviceId: args.services[0].id,

      serviceName: args.services
        .map((service) => service.name)
        .join(" + "),

      durationMinutes: totalDuration,

      serviceItems: args.services.map(
        (service) => ({
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes:
            service.durationMinutes,
          price: service.price,
        })
      ),

      date: args.date,
      startTime: args.startTime,
      endTime: end,

      status: "PENDING",
      source: "ONLINE",

      ...(args.notes
        ? {
            notes: args.notes,
          }
        : {}),

      /*
       * PROMO OPTIONAL
       * Field hanya dibuat jika benar-benar memiliki nilai.
       */
      ...(args.promo?.id
        ? {
            promoId: args.promo.id,
          }
        : {}),

      ...(args.promo?.code
        ? {
            promoCode: args.promo.code,
          }
        : {}),

      ...(args.promo?.discount !== undefined
        ? {
            promoDiscount:
              args.promo.discount,
          }
        : {}),

      price: Math.max(
        0,
        totalPrice -
          Number(
            args.promo?.discount || 0
          )
      ),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    tx.set(bookingRef, booking);

    /*
     * Buat lock untuk setiap slot.
     */
    slotTimes.forEach((slotTime) => {
      tx.set(
        lockRef(
          selectedBarber.id,
          args.date,
          slotTime
        ),
        {
          businessId: BUSINESS_ID,
          branchId: args.branchId,
          barberId: selectedBarber.id,
          date: args.date,
          slotTime,
          bookingId: bookingRef.id,
          ownerUid: args.customerId,
          createdAt: serverTimestamp(),
        }
      );
    });
  });

  /*
   * Setelah booking berhasil dibuat,
   * buat antrean.
   */
  const queue = await createQueueEntry({
    branchId: args.branchId,
    date: args.date,
    customerId: args.customerId,
    customerName: args.customerName,

    ...(args.customerPhone
      ? {
          customerPhone:
            args.customerPhone,
        }
      : {}),

    barberId: selectedBarber.id,
    barberName: selectedBarber.name,
    service: combinedService,
    bookingId: bookingRef.id,
    source: "ONLINE",
    initialStatus: "BOOKED",
  });

  return {
    id: bookingRef.id,
    code,
    queueNumber: queue.queueNumber,
    barber: selectedBarber,
  };
}

export async function cancelBooking(
  booking: Booking,
  actorUid: string
) {
  if (booking.customerId !== actorUid) {
    throw new Error(
      "Anda tidak memiliki akses ke booking ini."
    );
  }

  if (
    [
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ].includes(booking.status)
  ) {
    throw new Error(
      "Booking ini sudah tidak dapat dibatalkan."
    );
  }

  await runTransaction(db, async (tx) => {
    const bookingRef = doc(
      db,
      "businesses",
      BUSINESS_ID,
      "bookings",
      booking.id
    );

    const current = await tx.get(
      bookingRef
    );

    if (!current.exists()) {
      throw new Error(
        "Booking tidak ditemukan."
      );
    }

    for (
      let s = toMinutes(
        booking.startTime
      );
      s < toMinutes(
        booking.endTime
      );
      s += SLOT
    ) {
      tx.delete(
        lockRef(
          booking.barberId!,
          booking.date,
          fromMinutes(s)
        )
      );
    }

    tx.update(bookingRef, {
      status: "CANCELLED",
      updatedAt: serverTimestamp(),
    });
  });

  if (booking.queueNumber !== undefined) {
    const q = await getDocs(
      query(
        collection(
          db,
          "businesses",
          BUSINESS_ID,
          "queues"
        ),
        where(
          "bookingId",
          "==",
          booking.id
        )
      )
    );

    await Promise.all(
      q.docs.map((d) =>
        import("./queue").then(
          (module) =>
            module.cancelQueue(d.id)
        )
      )
    );
  }
}