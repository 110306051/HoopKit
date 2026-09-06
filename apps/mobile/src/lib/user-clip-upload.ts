import * as DocumentPicker from "expo-document-picker";
import {
  createUserClipUpload,
  type CreateUserClipUploadInput,
} from "@/lib/member-api";

export const MAX_USER_VIDEO_BYTES = 500 * 1024 * 1024;

export type PickedVideo = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file?: File;
};

export async function pickUserVideo(): Promise<PickedVideo | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "video/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const size = asset.size ?? asset.file?.size ?? 0;
  if (!size) throw new Error("無法讀取影片大小，請重新選擇檔案。");
  if (size > MAX_USER_VIDEO_BYTES) {
    throw new Error("影片不可超過 500 MB。");
  }
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? asset.file?.type ?? "video/mp4",
    size,
    file: asset.file,
  };
}

export async function uploadUserVideo(
  accessToken: string,
  file: PickedVideo,
  input: Omit<
    CreateUserClipUploadInput,
    "fileName" | "contentType" | "fileSize"
  >,
  onProgress?: (value: number, label: string) => void,
) {
  onProgress?.(5, "建立安全上傳網址…");
  const upload = await createUserClipUpload(accessToken, {
    ...input,
    fileName: file.name,
    contentType: file.mimeType,
    fileSize: file.size,
  });

  onProgress?.(10, "準備影片…");
  const body = file.file ?? (await fetch(file.uri)).blob();
  await putWithProgress(upload.uploadUrl, await body, file.mimeType, (value) => {
    onProgress?.(10 + Math.round(value * 0.85), `上傳中 ${Math.round(value * 100)}%`);
  });
  onProgress?.(100, "上傳完成，Mux 正在轉碼…");
  return upload;
}

function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", contentType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onerror = () => reject(new Error("影片上傳中斷，請檢查網路後重試。"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`影片上傳失敗（HTTP ${request.status}）。`));
    };
    request.send(body);
  });
}
