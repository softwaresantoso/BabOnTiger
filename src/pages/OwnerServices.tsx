import { useEffect, useState } from "react";
import {
  Edit3,
  Plus,
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
  deleteService,
  getAllServices,
  saveService,
  toggleService,
} from "../services/data";

import { useBusiness } from "../context/BusinessContext";

import type {
  Service,
} from "../types";

import ImageUploader from "../components/ImageUploader";

type ServiceForm = {
  name: string;
  branchId: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  imageUrl: string;
};

const emptyForm: ServiceForm = {
  name: "",
  branchId: "",
  category: "",
  description: "",
  durationMinutes: 30,
  price: 30000,
  imageUrl: "",
};

export default function OwnerServices() {
  const {
    business,
    branches,
  } = useBusiness();

  const [
    items,
    setItems,
  ] = useState<Service[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(null);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(null);

  const [
    form,
    setForm,
  ] = useState<ServiceForm>(
    emptyForm
  );

  const [
    error,
    setError,
  ] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);

      const data =
        await getAllServices();

      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data layanan."
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
    setForm(emptyForm);
    setError("");
  }

  function startEdit(
    service: Service
  ) {
    setEditingId(service.id);

    setForm({
      name: service.name,
      branchId:
        service.branchId ?? "",
      category:
        service.category ?? "",
      description:
        service.description ?? "",
      durationMinutes:
        service.durationMinutes,
      price:
        service.price,
      imageUrl:
        service.imageUrl ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit() {
    const name =
      form.name.trim();

    if (!name) {
      setError(
        "Nama layanan wajib diisi."
      );
      return;
    }

    if (!form.branchId) {
      setError(
        "Cabang wajib dipilih."
      );
      return;
    }

    if (
      !Number.isFinite(
        Number(
          form.durationMinutes
        )
      ) ||
      Number(
        form.durationMinutes
      ) <= 0
    ) {
      setError(
        "Durasi harus lebih dari 0 menit."
      );
      return;
    }

    if (
      !Number.isFinite(
        Number(form.price)
      ) ||
      Number(form.price) < 0
    ) {
      setError(
        "Harga layanan tidak valid."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const current =
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
          name,
          branchId:
            form.branchId,
          category:
            form.category.trim() ||
            undefined,
          description:
            form.description
              .trim() ||
            undefined,
          durationMinutes:
            Number(
              form.durationMinutes
            ),
          price:
            Number(form.price),
          imageUrl:
            form.imageUrl.trim() ||
            undefined,
          barberIds:
            current?.barberIds,
          active:
            current?.active ??
            true,
        },
        editingId ??
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

  async function handleToggle(
    service: Service
  ) {
    if (!service.id) {
      setError(
        "ID layanan tidak valid."
      );
      return;
    }

    try {
      setBusyId(service.id);
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
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(
    service: Service
  ) {
    if (!service.id) {
      setError(
        "ID layanan tidak valid."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus layanan "${service.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(service.id);
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
    } finally {
      setBusyId(null);
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
            Kelola layanan per cabang,
            harga, durasi, foto, dan
            status layanan.
          </p>
        </div>
      </div>

      {error && (
        <ErrorBox message={error} />
      )}

      <div className="panel">
        <div className="panel-title">
          <div>
            <div className="eyebrow">
              {editingId
                ? "EDIT SERVICE"
                : "NEW SERVICE"}
            </div>

            <h2>
              {editingId
                ? "Edit Layanan"
                : "Tambah Layanan"}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn secondary"
              onClick={
                resetForm
              }
            >
              <X size={16} />
              Batal
            </button>
          )}
        </div>

        <div className="form-grid">
          <label>
            Nama Layanan
            <input
              placeholder="Contoh: Haircut Premium"
              value={
                form.name
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    name: e.target
                      .value,
                  })
                )
              }
            />
          </label>

          <label>
            Cabang
            <select
              value={
                form.branchId
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    branchId:
                      e.target
                        .value,
                  })
                )
              }
            >
              <option value="">
                Pilih cabang
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={
                      branch.id
                    }
                    value={
                      branch.id
                    }
                  >
                    {branch.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Kategori
            <input
              placeholder="Contoh: Haircut"
              value={
                form.category
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    category:
                      e.target
                        .value,
                  })
                )
              }
            />
          </label>

          <label>
            Durasi (menit)
            <input
              type="number"
              min="1"
              value={
                form.durationMinutes
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    durationMinutes:
                      Number(
                        e.target
                          .value
                      ),
                  })
                )
              }
            />
          </label>

          <label>
            Harga (Rupiah)
            <input
              type="number"
              min="0"
              value={
                form.price
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    price:
                      Number(
                        e.target
                          .value
                      ),
                  })
                )
              }
            />
          </label>

          <label>
            Deskripsi
            <input
              placeholder="Penjelasan singkat layanan"
              value={
                form.description
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    description:
                      e.target
                        .value,
                  })
                )
              }
            />
          </label>
        </div>

        <ImageUploader
          value={
            form.imageUrl
          }
          onChange={(value) =>
            setForm(
              (current) => ({
                ...current,
                imageUrl:
                  value,
              })
            )
          }
          folder={`barber-online/${business.id}/services`}
          label="Foto layanan"
          hint="Opsional. Foto akan tampil pada katalog publik."
        />

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
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
                : "Tambah Layanan"}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn secondary"
              onClick={
                resetForm
              }
            >
              <X size={16} />
              Batal
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
        }}
      >
        {items.length === 0 ? (
          <Empty>
            Belum ada layanan.
          </Empty>
        ) : (
          <div className="cards">
            {items.map(
              (service) => {
                const branch =
                  branches.find(
                    (item) =>
                      item.id ===
                      service.branchId
                  );

                return (
                  <div
                    className="mini-card"
                    key={
                      service.id
                    }
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
                          "Tidak ada deskripsi."}
                      </p>

                      <span>
                        {branch?.name ||
                          "Cabang belum ditentukan"}
                        {" • "}
                        {service.durationMinutes}
                        {" menit • "}
                        {formatIDR(
                          service.price
                        )}
                      </span>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        Status:{" "}
                        {service.active
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
                            service
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
                          service.active
                            ? "danger"
                            : "secondary"
                        }`}
                        disabled={
                          busyId ===
                          service.id
                        }
                        onClick={() =>
                          handleToggle(
                            service
                          )
                        }
                      >
                        {service.active
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                      </button>

                      <button
                        type="button"
                        className="btn danger"
                        disabled={
                          busyId ===
                          service.id
                        }
                        onClick={() =>
                          handleDelete(
                            service
                          )
                        }
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