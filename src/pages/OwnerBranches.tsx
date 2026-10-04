import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Empty, ErrorBox } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { createBranch, deleteBranch, getAllBranches, updateBranch } from "../services/business";
import type { Branch } from "../types";

const emptyForm = { name: "", code: "", address: "", phone: "", active: true };

type BranchForm = typeof emptyForm;

export default function OwnerBranches() {
  const { refreshBranches } = useBusiness();
  const [items, setItems] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await getAllBranches());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat cabang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditing(null);
    setForm(emptyForm);
    setMessage("");
  }

  function edit(branch: Branch) {
    setEditing(branch.id);
    setForm({
      name: branch.name,
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
      active: branch.active,
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Nama cabang wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const successMessage = editing
        ? "Cabang berhasil diperbarui."
        : "Cabang berhasil ditambahkan.";
      if (editing) {
        await updateBranch(editing, form);
      } else {
        await createBranch(form);
      }
      await load();
      await refreshBranches();
      setEditing(null);
      setForm(emptyForm);
      setMessage(successMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan cabang.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(branch: Branch) {
    if (!confirm(`Hapus cabang "${branch.name}"?`)) return;
    setError("");
    try {
      await deleteBranch(branch.id);
      await load();
      await refreshBranches();
      setMessage("Cabang berhasil dihapus.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus cabang.");
    }
  }

  return <div>
    <div className="section-head">
      <div>
        <div className="eyebrow">BRANCH MANAGEMENT</div>
        <h1>Cabang</h1>
        <p className="muted">Kelola cabang, alamat, kontak, dan status operasional.</p>
      </div>
      <button className="btn secondary" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={16} /> Refresh
      </button>
    </div>

    {error && <ErrorBox message={error} />}
    {message && <div className="alert success">{message}</div>}

    <div className="owner-grid">
      <section className="panel">
        <div className="panel-title">
          <div><div className="eyebrow">{editing ? "EDIT CABANG" : "CABANG BARU"}</div><h2>{editing ? "Edit Cabang" : "Tambah Cabang"}</h2></div>
          {editing && <button className="btn ghost" onClick={reset}>Batal</button>}
        </div>

        <div className="form-grid">
          <label>Nama Cabang<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Barber Online - Jatiroto" /></label>
          <label>Kode Cabang<input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="JTR" /></label>
          <label>Nomor Telepon / WhatsApp<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" /></label>
          <label>Alamat<textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap cabang" /></label>
        </div>

        <label className="check"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Cabang aktif</label>
        <button className="btn primary full" disabled={saving} onClick={() => void save()}>
          {editing ? <Pencil size={16} /> : <Plus size={16} />}
          {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Cabang"}
        </button>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>Daftar Cabang</h2><span className="muted">{items.length} cabang</span></div>
        {loading ? <div className="empty">Memuat cabang...</div> : items.length === 0 ? <Empty>Belum ada cabang.</Empty> : <div className="cards">
          {items.map(branch => <div className="mini-card" key={branch.id}>
            <div className="avatar"><Building2 size={18} /></div>
            <div className="grow">
              <b>{branch.name}</b>
              <p>{branch.address || "Alamat belum diatur"}</p>
              <span>{branch.code || "Tanpa kode"} • {branch.phone || "Tanpa nomor"} • {branch.active ? "Aktif" : "Nonaktif"}</span>
            </div>
            <button className="btn small ghost" onClick={() => edit(branch)} aria-label={`Edit ${branch.name}`}><Pencil size={14} /></button>
            <button className="btn small danger" onClick={() => void remove(branch)} aria-label={`Hapus ${branch.name}`}><Trash2 size={14} /></button>
          </div>)}
        </div>}
      </section>
    </div>
  </div>;
}
