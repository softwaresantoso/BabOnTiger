import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./firebase";

export const cloudinaryConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

export function cloudinaryUploadUrl(resourceType: "image" | "auto" = "image") {
  if (!CLOUDINARY_CLOUD_NAME) throw new Error("Cloudinary belum dikonfigurasi.");
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
}
