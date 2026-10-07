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
  deleteBarber,
  getAllBarbers,
  saveBarber,
  toggleBarber,
} from "../services/data";

import { useBusiness } from "../context/BusinessContext";

import type {
  Barber,
} from "../types";

import ImageUploader from "../components/ImageUploader";

type BarberForm = {
  name: string;
  branchId: string;
  phone: string;
  bio: string;
  photoUrl: string;
};

const emptyForm: BarberForm = {
  name: "",
  branchId: "",
  phone: "",
  bio: "",
  photoUrl: "",
};

export default function OwnerBarbers() {
  const {
    business,
    branches,
  } = useBusiness();

  const [
    items,
    setItems,
  ] = useState<Barber[]>([]);

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
  ] = useState<BarberForm>(
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
        await getAllBarbers();

      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data barber."
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
    barber: Barber
  ) {
    setEditingId(barber.id);

    setForm({
      name: barber.name,
      branchId:
        barber.branchId ?? "",
      phone:
        barber.phone ?? "",
      bio:
        barber.bio ?? "",
      photoUrl:
        barber.photoUrl ?? "",
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
        "Nama barber wajib diisi."
      );
      return;
    }

    if (!form.branchId) {
      setError(
        "Cabang wajib dipilih."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await saveBarber(
        {
          businessId:
            business.id,
          name,
          branchId:
            form.branchId,
          phone:
            form.phone.trim() ||
            undefined,
          bio:
            form.bio.trim() ||
            undefined,
          photoUrl:
            form.photoUrl.trim() ||
            undefined,
          active:
            editingId
              ? items.find(
                  (item) =>
                    item.id ===
                    editingId
                )?.active ?? true
              : true,
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
          : "Gagal menyimpan barber."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(
    barber: Barber
  ) {
    if (!barber.id) {
      setError(
        "ID barber tidak valid."
      );
      return;
    }

    try {
      setBusyId(barber.id);
      setError("");

      await toggleBarber(
        barber.id,
        !barber.active
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status barber."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(
    barber: Barber
  ) {
    if (!barber.id) {
      setError(
        "ID barber tidak valid."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Hapus barber "${barber.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(barber.id);
      setError("");

      await deleteBarber(
        barber.id
      );

      if (
        editingId === barber.id
      ) {
        resetForm();
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus barber."
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
            TEAM
          </div>

          <h1>Barber</h1>

          <p className="muted">
            Kelola barber, cabang,
            profil, dan status
            keaktifan barber.
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
                ? "EDIT BARBER"
                : "NEW BARBER"}
            </div>

            <h2>
              {editingId
                ? "Edit Barber"
                : "Tambah Barber"}
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
            Nama Barber
            <input
              placeholder="Contoh: Andi"
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
            Nomor WhatsApp
            <input
              placeholder="Contoh: 081234567890"
              value={
                form.phone
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    phone: e.target
                      .value,
                  })
                )
              }
            />
          </label>

          <label>
            Bio
            <input
              placeholder="Contoh: Barber pria berpengalaman"
              value={
                form.bio
              }
              onChange={(e) =>
                setForm(
                  (current) => ({
                    ...current,
                    bio: e.target
                      .value,
                  })
                )
              }
            />
          </label>
        </div>

        <ImageUploader
          value={
            form.photoUrl
          }
          onChange={(value) =>
            setForm(
              (current) => ({
                ...current,
                photoUrl:
                  value,
              })
            )
          }
          folder={`barber-online/${business.id}/barbers`}
          label="Foto barber"
          hint="Opsional. Gunakan foto wajah/profil yang jelas."
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
                : "Tambah Barber"}
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
            Belum ada barber.
          </Empty>
        ) : (
          <div className="cards">
            {items.map(
              (barber) => {
                const branch =
                  branches.find(
                    (item) =>
                      item.id ===
                      barber.branchId
                  );

                return (
                  <div
                    className="mini-card"
                    key={
                      barber.id
                    }
                  >
                    {barber.photoUrl ? (
                      <img
                        className="thumb"
                        src={
                          barber.photoUrl
                        }
                        alt={
                          barber.name
                        }
                      />
                    ) : (
                      <div className="avatar">
                        {barber.name
                          .slice(
                            0,
                            1
                          )
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="grow">
                      <b>
                        {barber.name}
                      </b>

                      <p>
                        {barber.bio ||
                          "Barber profesional"}
                      </p>

                      <span>
                        Cabang:{" "}
                        {branch?.name ||
                          "Belum ditentukan"}
                      </span>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {barber.phone ||
                          "Nomor WhatsApp belum diisi"}
                      </small>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        Status:{" "}
                        {barber.active
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
                            barber
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
                          barber.active
                            ? "danger"
                            : "secondary"
                        }`}
                        disabled={
                          busyId ===
                          barber.id
                        }
                        onClick={() =>
                          handleToggle(
                            barber
                          )
                        }
                      >
                        {barber.active
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                      </button>

                      <button
                        type="button"
                        className="btn danger"
                        disabled={
                          busyId ===
                          barber.id
                        }
                        onClick={() =>
                          handleDelete(
                            barber
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