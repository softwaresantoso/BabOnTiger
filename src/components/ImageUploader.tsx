import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage } from "../services/media";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder: string;
  label?: string;
  hint?: string;
  maxSizeMb?: number;
}

export default function ImageUploader({ value, onChange, folder, label = "Gambar", hint, maxSizeMb = 5 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("File harus berupa gambar.");
    if (file.size > maxSizeMb * 1024 * 1024) return setError(`Ukuran gambar maksimal ${maxSizeMb} MB.`);
    setBusy(true);
    try { onChange(await uploadImage(file, folder)); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal mengunggah gambar."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  return <div className="image-uploader">
    <div className="image-uploader-head"><div><b>{label}</b>{hint && <small>{hint}</small>}</div>{value && <button type="button" className="btn small ghost" onClick={() => onChange("")}><X size={14}/> Hapus</button>}</div>
    {error && <div className="alert error">{error}</div>}
    {value ? <div className="image-preview"><img src={value} alt={label}/></div> : <div className="image-drop" onClick={() => !busy && inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}>
      {busy ? <><Loader2 size={22} className="spin"/><span>Mengunggah...</span></> : <><ImagePlus size={22}/><span>Klik untuk memilih gambar</span><small>JPG, PNG, WEBP • maksimal {maxSizeMb} MB</small></>}
    </div>}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => handleFile(e.target.files?.[0])}/>
  </div>;
}
