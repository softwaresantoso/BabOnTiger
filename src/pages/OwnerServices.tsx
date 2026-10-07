import { useEffect, useState } from "react";

import {
  deleteService,
  getAllServices,
  saveService,
  toggleService,
} from "../services/data";

import { useBusiness } from "../context/BusinessContext";

import type { Service } from "../types";

import {
  Loading,
} from "../components";

import ImageUploader from "../components/ImageUploader";

export default function AdminServices() {
  const { business } =
    useBusiness();

  const [items, setItems] =
    useState<Service[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [name, setName] =
    useState("");

  const [duration, setDuration] =
    useState(30);

  const [price, setPrice] =
    useState(30000);

  const [desc, setDesc] =
    useState("");

  const [imageUrl, setImageUrl] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getAllServices();

      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat layanan."
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
    setName("");
    setDuration(30);
    setPrice(30000);
    setDesc("");
    setImageUrl("");
    setError("");
  }

  function startEdit(
    service: Service
  ) {
    setEditingId(service.id);
    setName(service.name);
    setDuration(
      service.durationMinutes
    );
    setPrice(service.price);
    setDesc(
      service.description ||
        ""
    );
    setImageUrl(
      service.imageUrl ||
        ""
    );
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submit() {
    if (!name.trim()) {
      setError(
        "Nama layanan wajib diisi."
      );
      return;
    }

    if (
      !Number.isFinite(
        Number(duration)
      ) ||
      Number(duration) <= 0
    ) {
      setError(
        "Durasi harus lebih dari 0 menit."
      );
      return;
    }

    if (
      !Number.isFinite(
        Number(price)
      ) ||
      Number(price) < 0
    ) {
      setError(
        "Harga tidak valid."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const existing =
        editingId
          ? items.find(
              (item) =>
                item.id ===
                editingId
            )
          : undefined;

      await saveService(
        {
          businessId:
            business.id,

          branchId:
            existing?.branchId,

          name:
            name.trim(),

          description:
            desc.trim() ||
            undefined,

          durationMinutes:
            Number(duration),

          price:
            Number(price),

          imageUrl:
            imageUrl.trim() ||
            undefined,

          active:
            existing?.active ??
            true,
        },
        editingId ||
          undefined
      );

      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan layanan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(
    service: Service
  ) {
    const confirmed =
      window.confirm(
        `Hapus layanan "${service.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteService(
        service.id
      );

      if (
        editingId ===
        service.id
      ) {
        resetForm();
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus layanan."
      );
    }
  }

  async function toggle(
    service: Service
  ) {
    try {
      setError("");

      await toggleService(
        service.id,
        !service.active
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status layanan."
      );
    }
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            CATALOG
          </div>

          <h1>Layanan</h1>

          <p className="muted">
            Kelola layanan, durasi,
            harga, foto, dan status
            layanan.
          </p>
        </div>
      </div>

      {error && (
        <div className="panel">
          <p className="error">
            {error}
          </p>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">
              {editingId
                ? "EDIT LAYANAN"
                : "LAYANAN BARU"}
            </div>

            <h2>
              {editingId
                ? "Edit Layanan"
                : "Tambah Layanan"}
            </h2>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>
              Nama Layanan
            </span>

            <input
              placeholder="Contoh: Haircut"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />
          </label>

          <label>
            <span>
              Durasi
            </span>

            <input
              type="number"
              min="1"
              placeholder="Menit"
              value={duration}
              onChange={(e) =>
                setDuration(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <small className="muted">
              Lama pengerjaan layanan
              dalam menit.
            </small>
          </label>

          <label>
            <span>
              Harga
            </span>

            <input
              type="number"
              min="0"
              placeholder="Harga"
              value={price}
              onChange={(e) =>
                setPrice(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <small className="muted">
              Harga layanan dalam Rupiah.
            </small>
          </label>

          <label>
            <span>
              Deskripsi
            </span>

            <input
              placeholder="Contoh: Potong rambut pria"
              value={desc}
              onChange={(e) =>
                setDesc(
                  e.target.value
                )
              }
            />

            <small className="muted">
              Keterangan singkat yang
              akan membantu pelanggan
              memahami layanan.
            </small>
          </label>
        </div>

        <ImageUploader
          value={imageUrl}
          onChange={setImageUrl}
          folder={`barber-online/${business.id}/services`}
          label="Foto Layanan"
          hint="Opsional. Foto akan digunakan pada katalog."
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            className="btn primary"
            disabled={
              saving ||
              !name.trim()
            }
            onClick={submit}
          >
            {saving
              ? "Menyimpan..."
              : editingId
              ? "Simpan Perubahan"
              : "Tambah Layanan"}
          </button>

          {editingId && (
            <button
              className="btn secondary"
              disabled={saving}
              onClick={resetForm}
            >
              Batal Edit
            </button>
          )}
        </div>
      </div>

      <div className="cards">
        {items.length === 0 ? (
          <div className="panel">
            <p className="muted">
              Belum ada layanan.
            </p>
          </div>
        ) : (
          items.map(
            (service) => (
              <div
                className="mini-card"
                key={service.id}
              >
                {service.imageUrl ? (
                  <img
                    className="thumb"
                    src={
                      service.imageUrl
                    }
                    alt={
                      service.name
                    }
                  />
                ) : (
                  <div className="avatar">
                    S
                  </div>
                )}

                <div className="grow">
                  <b>
                    {service.name}
                  </b>

                  <p>
                    {service.description ||
                      "Tidak ada deskripsi"}
                  </p>

                  <span>
                    {
                      service.durationMinutes
                    }{" "}
                    menit •{" "}
                    {formatIDR(
                      service.price
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <button
                    className="btn secondary"
                    onClick={() =>
                      startEdit(
                        service
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    className={`btn ${
                      service.active
                        ? "danger"
                        : "secondary"
                    }`}
                    onClick={() =>
                      toggle(
                        service
                      )
                    }
                  >
                    {service.active
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>

                  <button
                    className="btn danger"
                    onClick={() =>
                      remove(
                        service
                      )
                    }
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}

function formatIDR(
  value: number
) {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }
  ).format(value);
}