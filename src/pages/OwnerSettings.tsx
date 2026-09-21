import { useState } from "react";
import { Save } from "lucide-react";
import { ErrorBox } from "../components";
import { useBusiness } from "../context/BusinessContext";
import { updateBusiness } from "../services/business";
import ImageUploader from "../components/ImageUploader";

export default function OwnerSettings() {
  const { business } = useBusiness();
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone || "");
  const [email, setEmail] = useState(business.email || "");
  const [address, setAddress] = useState(business.address || "");
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(business.primaryColor || "#c6a15b");
  const [secondaryColor, setSecondaryColor] = useState(business.secondaryColor || "#11161b");
  const [timezone, setTimezone] = useState(business.timezone || "Asia/Jakarta");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return setError("Nama bisnis wajib diisi.");
    setSaving(true); setError(""); setMessage("");
    try {
      await updateBusiness({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, address: address.trim() || undefined, logoUrl: logoUrl || undefined, primaryColor, secondaryColor, timezone });
      setMessage("Pengaturan bisnis tersimpan. Muat ulang halaman agar branding header ikut diperbarui.");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan pengaturan."); }
    finally { setSaving(false); }
  }

  return <div><div className="section-head"><div><div className="eyebrow">BUSINESS SETTINGS</div><h1>Pengaturan</h1><p className="muted">Branding bisnis dan konfigurasi dasar Barber Online.</p></div></div>
    {error && <ErrorBox message={error}/>} {message && <div className="alert success">{message}</div>}
    <section className="panel"><h2>Identitas Bisnis</h2><div className="form-grid"><label>Nama bisnis<input value={name} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp / Telepon<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Alamat<textarea rows={3} value={address} onChange={e=>setAddress(e.target.value)}/></label></div><ImageUploader value={logoUrl} onChange={setLogoUrl} folder={`barber-online/${business.id}/business`} label="Logo bisnis" hint="Gunakan PNG/WebP transparan bila tersedia" maxSizeMb={5}/></section>
    <section className="panel"><h2>Branding</h2><div className="form-grid"><label>Warna utama<input type="text" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} placeholder="#c6a15b"/></label><label>Warna sekunder<input type="text" value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} placeholder="#11161b"/></label><label>Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} placeholder="Asia/Jakarta"/></label></div></section>
    <button className="btn primary" disabled={saving} onClick={save}><Save size={16}/>{saving?"Menyimpan...":"Simpan Pengaturan"}</button>
  </div>;
}
