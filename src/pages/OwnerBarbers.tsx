import { useEffect, useState } from "react";
import {
  getAllBarbers,
  saveBarber,
  toggleBarber,
  deleteBarber,
} from "../services/data";
import { useBusiness } from "../context/BusinessContext";
import type { Barber } from "../types";
import { Loading } from "../components";
import ImageUploader from "../components/ImageUploader";

export default function AdminBarbers() {
  const {
    business,
    branches,
  } = useBusiness();

  const [items, setItems] =
    useState<Barber[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [name, setName] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

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
    setName("");
    setBio("");
    setPhotoUrl("");
    setBranchId("");
    setError("");
  }

  function startEdit(barber: Barber) {
    setEditingId(barber.id);
    setName(barber.name);
    setBio(barber.bio || "");
    setPhotoUrl(barber.photoUrl || "");
    setBranchId(barber.branchId || "");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submit() {
    if (!name.trim()) {
      setError(
        "Nama barber wajib diisi."
      );
      return;
    }

    if (!branchId) {
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
          branchId,
          name:
            name.trim(),
          bio:
            bio.trim() ||
            undefined,
          photoUrl:
            photoUrl.trim() ||
            undefined,
          active: true,
        },
        editingId || undefined
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

  async function remove(
    barber: Barber
  ) {
    const confirmed =
      window.confirm(
        `Hapus barber "${barber.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
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
    }
  }

  async function toggle(
    barber: Barber
  ) {
    try {
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
            Kelola barber, cabang, profil,
            foto, dan status barber.
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
                ? "EDIT BARBER"
                : "BARBER BARU"}
            </div>

            <h2>
              {editingId
                ? "Edit Barber"
                : "Tambah Barber"}
            </h2>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Nama Barber</span>

            <input
              placeholder="Contoh: Andi"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </label>

          <label>
            <span>Cabang</span>

            <select
              value={branchId}
              onChange={(e) =>
                setBranchId(
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
              Barber harus ditempatkan pada
              satu cabang agar dapat muncul
              saat pelanggan melakukan booking.
            </small>
          </label>

          <label>
            <span>Bio Singkat</span>

            <input
              placeholder="Contoh: Spesialis fade dan pompadour"
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
            />
          </label>
        </div>

        <ImageUploader
          value={photoUrl}
          onChange={setPhotoUrl}
          folder={`barber-online/${business.id}/barbers`}
          label="Foto Barber"
          hint="Opsional. Gunakan foto profil barber."
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
              !name.trim() ||
              !branchId
            }
            onClick={submit}
          >
            {saving
              ? "Menyimpan..."
              : editingId
              ? "Simpan Perubahan"
              : "Tambah Barber"}
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
              Belum ada barber.
            </p>
          </div>
        ) : (
          items.map((barber) => {
            const branch =
              branches.find(
                (item) =>
                  item.id ===
                  barber.branchId
              );

            return (
              <div
                className="mini-card"
                key={barber.id}
              >
                {barber.photoUrl ? (
                  <img
                    className="thumb"
                    src={barber.photoUrl}
                    alt={barber.name}
                  />
                ) : (
                  <div className="avatar">
                    {barber.name
                      .slice(0, 1)
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

                  <small>
                    Cabang:{" "}
                    {branch?.name ||
                      "Belum ditentukan"}
                  </small>
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
                        barber
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    className={`btn ${
                      barber.active
                        ? "danger"
                        : "secondary"
                    }`}
                    onClick={() =>
                      toggle(barber)
                    }
                  >
                    {barber.active
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>

                  <button
                    className="btn danger"
                    onClick={() =>
                      remove(barber)
                    }
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}