import { cloudinaryConfigured, cloudinaryUploadUrl } from "../lib/cloudinary";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../lib/firebase";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
function safeFolder(folder: string) { return folder.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "") || "barber-online"; }

export async function uploadImage(file: File, folder = "barber-online") {
  if (!cloudinaryConfigured || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran gambar maksimal 5 MB.");
  const body = new FormData(); body.append("file", file); body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); body.append("folder", safeFolder(folder));
  const response = await fetch(cloudinaryUploadUrl(), { method: "POST", body });
  const data = await response.json().catch(() => ({})) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Upload gambar gagal.");
  if (!data.secure_url) throw new Error("Cloudinary tidak mengembalikan URL gambar.");
  return data.secure_url;
}
