import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Plus,
  Receipt,
  RefreshCw,
} from "lucide-react";

import {
  Empty,
  ErrorBox,
  Loading,
} from "../components";

import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";

import {
  getAllBookings,
  getActiveServices,
} from "../services/data";

import {
  getProducts,
} from "../services/inventory";

import {
  createTransaction,
  getTransactionForBooking,
  getTransactions,
  markTransactionPaid,
} from "../services/transaction";

import type {
  Booking,
  Product,
  Service,
  Transaction,
  TransactionItem,
} from "../types";

const money = (
  value: number
) =>
  new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(value);

const methods: NonNullable<
  Transaction["method"]
>[] = [
  "CASH",
  "QRIS",
  "TRANSFER",
  "OTHER",
];

export default function Transactions({
  barberOnly = false,
}: {
  barberOnly?: boolean;
}) {
  const { profile } =
    useAuth();

  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
  } = useBusiness();

  const [items, setItems] =
    useState<Transaction[]>(
      []
    );

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [services, setServices] =
    useState<Service[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [bookingId, setBookingId] =
    useState("");

  const [method, setMethod] =
    useState<
      NonNullable<
        Transaction["method"]
      >
    >("CASH");

  const [discount, setDiscount] =
    useState(0);

  const [lines, setLines] =
    useState<TransactionItem[]>(
      []
    );

  const [serviceId, setServiceId] =
    useState("");

  const [productId, setProductId] =
    useState("");

  const [qty, setQty] =
    useState(1);

  const [busy, setBusy] =
    useState(false);

  const activeBranchId =
    selectedBranchId || "";

  async function load() {
    if (!activeBranchId) {
      setItems([]);
      setBookings([]);
      setServices([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setError("");

      const [
        transactions,
        allBookings,
        allServices,
        allProducts,
      ] = await Promise.all([
        getTransactions(
          activeBranchId,
          barberOnly
            ? profile?.barberId
            : undefined
        ),

        getAllBookings(),

        getActiveServices(),

        getProducts(
          activeBranchId,
          true
        ),
      ]);

      setItems(
        transactions
      );

      setBookings(
        allBookings.filter(
          (booking) =>
            booking.branchId ===
            activeBranchId
        )
      );

      setServices(
        allServices.filter(
          (service) =>
            !service.branchId ||
            service.branchId ===
              activeBranchId
        )
      );

      setProducts(
        allProducts
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat transaksi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    activeBranchId,
    profile?.barberId,
    barberOnly,
  ]);

  const selectedBooking =
    bookings.find(
      (booking) =>
        booking.id ===
        bookingId
    );

  const subtotal =
    useMemo(
      () =>
        lines.reduce(
          (total, item) =>
            total +
            item.subtotal,
          0
        ),
      [lines]
    );

  const total =
    Math.max(
      0,
      subtotal -
        Number(
          discount || 0
        )
    );

  function handleBranchChange(
    branchId: string
  ) {
    setSelectedBranchId(
      branchId
    );

    setBookingId("");
    setLines([]);
    setServiceId("");
    setProductId("");
    setDiscount(0);
    setError("");
  }

  function addService() {
    const service =
      services.find(
        (item) =>
          item.id ===
          serviceId
      );

    if (!service) {
      return;
    }

    setLines(
      (current) => [
        ...current,
        {
          type: "SERVICE",
          itemId:
            service.id,
          name:
            service.name,
          quantity: 1,
          unitPrice:
            service.price,
          subtotal:
            service.price,
        },
      ]
    );

    setServiceId("");
  }

  function addProduct() {
    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      );

    if (!product) {
      return;
    }

    const quantity =
      Number(qty);

    if (
      quantity < 1
    ) {
      return;
    }

    if (
      quantity >
      product.stock
    ) {
      setError(
        `Stok ${product.name} hanya tersedia ${product.stock}.`
      );
      return;
    }

    setLines(
      (current) => [
        ...current,
        {
          type: "PRODUCT",
          itemId:
            product.id,
          name:
            product.name,
          quantity,
          unitPrice:
            product.sellingPrice,
          subtotal:
            product.sellingPrice *
            quantity,
        },
      ]
    );

    setProductId("");
    setQty(1);
  }

  function removeLine(
    index: number
  ) {
    setLines(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );
  }

  async function create() {
    if (
      !activeBranchId ||
      !profile ||
      !lines.length
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      let barber =
        profile.barberId
          ? {
              id:
                profile.barberId,
              name:
                profile.name,
            }
          : undefined;

      if (
        selectedBooking?.barberId
      ) {
        barber = {
          id:
            selectedBooking.barberId,
          name:
            selectedBooking.barberName ||
            "",
        };
      }

      await createTransaction({
        branchId:
          activeBranchId,

        booking:
          selectedBooking,

        customerId:
          selectedBooking?.customerId,

        customerName:
          selectedBooking?.customerName,

        customerPhone:
          selectedBooking?.customerPhone,

        barberId:
          barber?.id,

        barberName:
          barber?.name,

        items: lines,

        discount,

        method,

        createdBy:
          profile.uid,
      });

      setBookingId("");
      setLines([]);
      setDiscount(0);

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat transaksi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseBooking(
    id: string
  ) {
    setBookingId(id);

    if (!id) {
      return;
    }

    try {
      const existing =
        await getTransactionForBooking(
          id
        );

      if (existing) {
        setError(
          "Booking ini sudah memiliki transaksi. Silakan buka daftar transaksi."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memeriksa transaksi booking."
      );
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (!activeBranchId) {
    return (
      <div>
        <div className="section-head">
          <div>
            <div className="eyebrow">
              TRANSACTIONS
            </div>

            <h1>
              Transaksi
            </h1>
          </div>
        </div>

        <div className="panel">
          <label>
            <span>
              Pilih Cabang
            </span>

            <select
              value=""
              onChange={(e) =>
                handleBranchChange(
                  e.target.value
                )
              }
            >
              <option value="">
                Pilih cabang
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                )
              )}
            </select>

            <small className="muted">
              Pilih cabang tempat
              transaksi akan dibuat.
            </small>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            TRANSACTIONS
          </div>

          <h1>
            Transaksi
          </h1>

          <p className="muted">
            Service + product dalam
            satu transaksi.
            Pembayaran Cash, QRIS,
            Transfer, atau Other.
          </p>
        </div>

        <button
          className="btn secondary"
          onClick={load}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      <div className="panel">
        <label>
          <span>
            Cabang Transaksi
          </span>

          <select
            value={
              activeBranchId
            }
            onChange={(e) =>
              handleBranchChange(
                e.target.value
              )
            }
            disabled={
              barberOnly
            }
          >
            {branches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              )
            )}
          </select>

          <small className="muted">
            Semua booking, produk,
            layanan, dan transaksi
            pada halaman ini mengikuti
            cabang yang dipilih.
          </small>
        </label>
      </div>

      <div className="owner-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">
                NEW TRANSACTION
              </div>

              <h2>
                Buat Transaksi
              </h2>
            </div>
          </div>

          <label>
            <span>
              Booking
              <small>
                {" "}
                (opsional)
              </small>
            </span>

            <select
              value={
                bookingId
              }
              onChange={(e) =>
                chooseBooking(
                  e.target.value
                )
              }
            >
              <option value="">
                Walk-in / tanpa booking
              </option>

              {bookings
                .filter(
                  (booking) =>
                    ![
                      "CANCELLED",
                      "NO_SHOW",
                    ].includes(
                      booking.status
                    )
                )
                .map(
                  (booking) => (
                    <option
                      key={
                        booking.id
                      }
                      value={
                        booking.id
                      }
                    >
                      {
                        booking.date
                      }{" "}
                      {
                        booking.startTime
                      }{" "}
                      •{" "}
                      {
                        booking.customerName
                      }{" "}
                      •{" "}
                      {booking.code}
                    </option>
                  )
                )}
            </select>

            <small className="muted">
              Pilih booking jika
              transaksi berasal dari
              booking online. Untuk
              pelanggan datang langsung,
              biarkan "Walk-in".
            </small>
          </label>

          <div className="form-grid">
            <select
              value={
                serviceId
              }
              onChange={(e) =>
                setServiceId(
                  e.target.value
                )
              }
            >
              <option value="">
                Pilih layanan
              </option>

              {services.map(
                (service) => (
                  <option
                    key={
                      service.id
                    }
                    value={
                      service.id
                    }
                  >
                    {service.name} •{" "}
                    {money(
                      service.price
                    )}
                  </option>
                )
              )}
            </select>

            <button
              className="btn secondary"
              onClick={
                addService
              }
              disabled={
                !serviceId
              }
            >
              <Plus size={15} />
              Tambah layanan
            </button>

            <select
              value={
                productId
              }
              onChange={(e) =>
                setProductId(
                  e.target.value
                )
              }
            >
              <option value="">
                Pilih produk
              </option>

              {products.map(
                (product) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.name} •
                    stok{" "}
                    {
                      product.stock
                    } •{" "}
                    {money(
                      product.sellingPrice
                    )}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) =>
                setQty(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <button
              className="btn secondary"
              onClick={
                addProduct
              }
              disabled={
                !productId
              }
            >
              <Plus size={15} />
              Tambah produk
            </button>
          </div>

          {lines.length === 0 ? (
            <Empty>
              Belum ada item transaksi.
            </Empty>
          ) : (
            <div className="table">
              {lines.map(
                (item, index) => (
                  <div
                    className="table-row"
                    key={`${item.itemId}-${index}`}
                  >
                    <div>
                      <b>
                        {
                          item.name
                        }
                      </b>

                      <small>
                        {item.type} •{" "}
                        {
                          item.quantity
                        }{" "}
                        ×{" "}
                        {money(
                          item.unitPrice
                        )}
                      </small>
                    </div>

                    <strong>
                      {money(
                        item.subtotal
                      )}
                    </strong>

                    <button
                      className="btn danger small"
                      onClick={() =>
                        removeLine(
                          index
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="form-grid">
            <label>
              <span>
                Diskon
              </span>

              <input
                type="number"
                min="0"
                placeholder="0"
                value={
                  discount
                }
                onChange={(e) =>
                  setDiscount(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

              <small className="muted">
                Masukkan nominal diskon
                dalam Rupiah.
              </small>
            </label>

            <label>
              <span>
                Metode Pembayaran
              </span>

              <select
                value={
                  method
                }
                onChange={(e) =>
                  setMethod(
                    e.target
                      .value as NonNullable<
                      Transaction["method"]
                    >
                  )
                }
              >
                {methods.map(
                  (item) => (
                    <option
                      key={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="checkout-total">
            <span>
              Subtotal{" "}
              <b>
                {money(
                  subtotal
                )}
              </b>
            </span>

            <span>
              Diskon{" "}
              <b>
                -
                {money(
                  discount
                )}
              </b>
            </span>

            <strong>
              Total{" "}
              {money(total)}
            </strong>
          </div>

          <button
            className="btn primary full"
            disabled={
              busy ||
              !lines.length
            }
            onClick={create}
          >
            <Receipt size={16} />

            {busy
              ? "Menyimpan..."
              : "Finalisasi Transaksi"}
          </button>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <div className="eyebrow">
                RECENT
              </div>

              <h2>
                Transaksi Terbaru
              </h2>
            </div>
          </div>

          {items.length === 0 ? (
            <Empty>
              Belum ada transaksi.
            </Empty>
          ) : (
            <div className="cards">
              {items
                .slice(0, 30)
                .map(
                  (transaction) => (
                    <TransactionCard
                      key={
                        transaction.id
                      }
                      transaction={
                        transaction
                      }
                      onPaid={async () => {
                        await markTransactionPaid(
                          transaction.id,
                          "CASH"
                        );

                        await load();
                      }}
                    />
                  )
                )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TransactionCard({
  transaction,
  onPaid,
}: {
  transaction: Transaction;
  onPaid: () => Promise<void>;
}) {
  return (
    <div className="mini-card">
      <div className="avatar">
        <CheckCircle2
          size={17}
        />
      </div>

      <div className="grow">
        <b>
          {transaction.customerName ||
            "Walk-in"}
        </b>

        <span>
          {transaction.items
            ?.map(
              (item) =>
                `${item.name} ×${item.quantity}`
            )
            .join(", ") ||
            "-"}
        </span>

        <p>
          {money(
            transaction.total
          )}{" "}
          •{" "}
          {transaction.method ||
            transaction.paymentMethod ||
            "-"}
        </p>

        <small>
          {transaction.status}
        </small>
      </div>

      {transaction.status !==
        "PAID" && (
        <button
          className="btn small primary"
          onClick={onPaid}
        >
          Tandai Lunas
        </button>
      )}
    </div>
  );
}