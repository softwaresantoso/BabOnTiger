import { cloudinaryConfigured, cloudinaryUploadUrl } from "../lib/cloudinary";
import { CLOUDINARY_UPLOAD_PRESET } from "../lib/firebase";

export async function uploadImage(file: File, folder = "barber-online") {
  if (!cloudinaryConfigured || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  body.append("folder", folder);

  const response = await fetch(cloudinaryUploadUrl(), { method: "POST", body });
  if (!response.ok) throw new Error("Upload gambar gagal.");
  const data = await response.json() as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary tidak mengembalikan URL gambar.");
  return data.secure_url;
}
