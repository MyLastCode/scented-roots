// Shared unsigned-upload helper. Save this as src/lib/cloudinary.ts
// (replacing the first version).
//
// Reads EXPO_PUBLIC_CLOUDINARY_* env vars if you've set them, otherwise falls
// back to the values that were already hardcoded in your screens. Both are
// public (unsigned preset), so this is safe to ship in the client.
const CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "qkpbnofd";
const UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "fragrance_app_unsigned";

export async function uploadImage(uri: string, filename = "photo.jpg") {
  const imageResponse = await fetch(uri);
  const blob = await imageResponse.blob();

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  const data = await response.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? "Upload failed");
  return data.secure_url as string;
}
