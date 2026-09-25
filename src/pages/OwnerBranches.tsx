import { useEffect, useState } from "react";
import { Loading } from "../components";
import { useBusiness } from "../context/BusinessContext";
import {
  getAllBranches,
  saveBranch,
  toggleBranch,
} from "../services/business";
import type { Branch } from "../types";

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  queuePrefix: string;
  resetDaily: boolean;
};

const emptyForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  queuePrefix: "",
  resetDaily: true,
};

export default function OwnerBranches() {
  const { business } = useBusiness();

  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      setLoading(true);

      const branches = await getAllBranches();
      setItems(branches);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data branch."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField<K extends keyof BranchForm>(
    field: K,
    value: BranchForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEdit(branch: Branch) {
    setEditingId(branch.id);

    setForm({
      name: branch.name,
      code: branch.code ?? "",
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      queuePrefix: branch.queueSettings?.prefix ?? "",
      resetDaily: branch.queueSettings?.resetDaily ?? true,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit() {
    const name = form.name.trim();

    if (!name) {
      setError("Nama branch wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: Omit<Branch, "id"> = {
        businessId: business.id,
        name,
        code: form.code.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        queueSettings: {
          resetDaily: form.resetDaily,
          prefix: form.queuePrefix.trim() || undefined,
        },
        active: true,
      };

      await saveBranch(payload, editingId ?? undefined);

      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan branch."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(branch: Branch) {
    try {
      setError("");

      await toggleBranch(branch.id, !branch.active);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status branch."
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
          <div className="eyebrow">BUSINESS</div>

          <h1>Branch</h1>

          <p className="muted">
            Kelola cabang barber, informasi kontak, dan pengaturan antrean.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="panel"
          style={{
            marginBottom: 16,
            borderColor: "#b94a48",
          }}
        >
          <strong>Terjadi masalah</strong>
          <p className="muted">{error}</p>
        </div>
      )}

      <div className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">
              {editingId ? "EDIT BRANCH" : "NEW BRANCH"}
            </div>

            <h2>
              {editingId
                ? "Edit Branch"
                : "Tambah Branch"}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn secondary"
              onClick={resetForm}
            >
              Batal
            </button>
          )}
        </div>

        <div className="form-grid">
          <input
            placeholder="Nama branch *"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
          />

          <input
            placeholder="Kode branch"
            value={form.code}
            onChange={(event) =>
              updateField("code", event.target.value)
            }
          />

          <input
            placeholder="Nomor telepon"
            value={form.phone}
            onChange={(event) =>
              updateField("phone", event.target.value)
            }
          />

          <input
            placeholder="Prefix antrean, contoh A"
            value={form.queuePrefix}
            onChange={(event) =>
              updateField(
                "queuePrefix",
                event.target.value.toUpperCase()
              )
            }
          />

          <input
            className="wide"
            placeholder="Alamat branch"
            value={form.address}
            onChange={(event) =>
              updateField("address", event.target.value)
            }
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 16,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.resetDaily}
            onChange={(event) =>
              updateField(
                "resetDaily",
                event.target.checked
              )
            }
          />

          <span>
            Nomor antrean reset setiap hari
          </span>
        </label>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="btn primary"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving
              ? "Menyimpan..."
              : editingId
                ? "Simpan Perubahan"
                : "Tambah Branch"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="section-head">
          <div>
            <div className="eyebrow">BRANCH LIST</div>

            <h2>
              Daftar Branch ({items.length})
            </h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="panel">
            <h3>Belum ada branch</h3>

            <p className="muted">
              Tambahkan branch pertama untuk mulai
              menggunakan fitur operasional Barber Online.
            </p>
          </div>
        ) : (
          <div className="cards">
            {items.map((branch) => (
              <div
                className="mini-card"
                key={branch.id}
              >
                <div className="avatar">
                  {branch.name
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="grow">
                  <b>{branch.name}</b>

                  <p>
                    {branch.code
                      ? `Kode: ${branch.code}`
                      : "Tanpa kode branch"}
                  </p>

                  {branch.address && (
                    <p>{branch.address}</p>
                  )}

                  {branch.phone && (
                    <p>{branch.phone}</p>
                  )}

                  <span>
                    {branch.queueSettings?.prefix
                      ? `Prefix antrean: ${branch.queueSettings.prefix}`
                      : "Tanpa prefix antrean"}
                    {" • "}
                    {branch.queueSettings?.resetDaily !== false
                      ? "Reset harian"
                      : "Tidak reset harian"}
                  </span>

                  <div style={{ marginTop: 8 }}>
                    <strong>
                      {branch.active
                        ? "Aktif"
                        : "Nonaktif"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      startEdit(branch)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={`btn ${
                      branch.active
                        ? "danger"
                        : "secondary"
                    }`}
                    onClick={() =>
                      handleToggle(branch)
                    }
                  >
                    {branch.active
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}