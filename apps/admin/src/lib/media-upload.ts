"use client";

import { adminClientApiRequest } from "@/lib/admin-client-api";
import { createClient } from "@/lib/supabase/client";
import type { MediaAsset } from "@/types/admin";

export const IMAGE_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

type ImageUploadOptions = {
  file: File;
  title: string;
  onProgress?: (progress: number, message: string) => void;
};

/**
 * Creates a media row through NestJS, uploads the bytes directly to Supabase
 * Storage with a one-file token, then marks the media row ready.
 */
export async function uploadImageToMediaLibrary({
  file,
  title,
  onProgress,
}: ImageUploadOptions): Promise<MediaAsset> {
  validateImage(file);
  onProgress?.(10, "取得安全上傳權限…");

  const upload = await adminClientApiRequest<{
    asset: MediaAsset;
    bucket: string;
    path: string;
    token: string;
  }>("/admin/media/images/upload-url", {
    method: "POST",
    body: JSON.stringify({
      title: title.trim() || fileTitle(file.name),
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  onProgress?.(45, "上傳至 Supabase Storage…");
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: file.type,
    });
  if (error) throw error;

  const dimensions = await readImageDimensions(file);
  onProgress?.(85, "寫入圖片資訊…");

  return adminClientApiRequest<MediaAsset>(
    `/admin/media/images/${upload.asset.id}/complete`,
    {
      method: "POST",
      body: JSON.stringify(dimensions),
    },
  );
}

export function fileTitle(name: string) {
  return name.replace(/\.[^.]+$/, "").slice(0, 120) || "未命名媒體";
}

function validateImage(file: File) {
  if (
    !IMAGE_UPLOAD_TYPES.includes(
      file.type as (typeof IMAGE_UPLOAD_TYPES)[number],
    )
  ) {
    throw new Error("僅支援 JPG、PNG、WebP 或 GIF。");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("圖片不可超過 10 MB。");
  }
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("無法讀取圖片尺寸。"));
    };
    image.src = url;
  });
}
