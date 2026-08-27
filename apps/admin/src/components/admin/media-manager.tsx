"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { adminClientApiRequest } from "@/lib/admin-client-api";
import {
  fileTitle,
  IMAGE_UPLOAD_TYPES,
  uploadImageToMediaLibrary,
} from "@/lib/media-upload";
import type { MediaAsset } from "@/types/admin";
import { MediaPreview } from "./media-preview";

type UploadState = {
  busy: boolean;
  progress: number;
  message: string | null;
  error: string | null;
};

const idleUpload: UploadState = {
  busy: false,
  progress: 0,
  message: null,
  error: null,
};

export function MediaManager({
  initialAssets,
}: {
  initialAssets: MediaAsset[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageTitle, setImageTitle] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [imageUpload, setImageUpload] = useState(idleUpload);
  const [videoUpload, setVideoUpload] = useState(idleUpload);
  const [refreshing, setRefreshing] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const hasPending = useMemo(
    () => assets.some((asset) => asset.status === "pending"),
    [assets],
  );

  async function refreshMedia(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      setAssets(await adminClientApiRequest<MediaAsset[]>("/admin/media"));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => void refreshMedia(true), 5000);
    return () => window.clearInterval(timer);
  }, [hasPending]);

  async function handleImageUpload(event: FormEvent) {
    event.preventDefault();
    if (!imageFile) return;
    setImageUpload({
      busy: true,
      progress: 0,
      message: "準備上傳…",
      error: null,
    });
    try {
      await uploadImageToMediaLibrary({
        file: imageFile,
        title: imageTitle,
        onProgress: (progress, message) =>
          setImageUpload({ busy: true, progress, message, error: null }),
      });
      await refreshMedia(true);
      setImageFile(null);
      setImageTitle("");
      if (imageInput.current) imageInput.current.value = "";
      setImageUpload({
        busy: false,
        progress: 100,
        message: "圖片上傳完成。",
        error: null,
      });
    } catch (error) {
      setImageUpload({
        busy: false,
        progress: 0,
        message: null,
        error: errorMessage(error),
      });
    }
  }

  async function handleVideoUpload(event: FormEvent) {
    event.preventDefault();
    if (!videoFile) return;
    if (!videoFile.type.startsWith("video/")) {
      setVideoUpload({ ...idleUpload, error: "請選擇影片檔案。" });
      return;
    }

    setVideoUpload({
      busy: true,
      progress: 2,
      message: "向 Mux 建立直傳網址…",
      error: null,
    });
    try {
      const upload = await adminClientApiRequest<{
        assetId: string;
        uploadId: string;
        uploadUrl: string;
      }>("/admin/media/videos/upload-url", {
        method: "POST",
        body: JSON.stringify({
          title: videoTitle.trim() || fileTitle(videoFile.name),
          fileName: videoFile.name,
          contentType: videoFile.type,
          fileSize: videoFile.size,
        }),
      });

      await uploadWithProgress(upload.uploadUrl, videoFile, (progress) => {
        setVideoUpload({
          busy: true,
          progress,
          message: `影片直傳 Mux：${progress}%`,
          error: null,
        });
      });
      await refreshMedia(true);
      setVideoFile(null);
      setVideoTitle("");
      if (videoInput.current) videoInput.current.value = "";
      setVideoUpload({
        busy: false,
        progress: 100,
        message: "上傳完成；Mux 正在轉碼，列表會自動更新。",
        error: null,
      });
    } catch (error) {
      setVideoUpload({
        busy: false,
        progress: 0,
        message: null,
        error: errorMessage(error),
      });
    }
  }

  return (
    <div className="mt-10 space-y-10">
      <section className="grid gap-5 xl:grid-cols-2">
        <UploadCard
          eyebrow="SUPABASE STORAGE"
          title="上傳圖片"
          description="JPG、PNG、WebP、GIF，單檔上限 10 MB。可用於球員頭像、招式封面或菜單封面。"
          state={imageUpload}
        >
          <form className="mt-6 space-y-4" onSubmit={handleImageUpload}>
            <input
              className="field-input"
              placeholder="顯示名稱（留白會使用檔名）"
              maxLength={120}
              value={imageTitle}
              onChange={(event) => setImageTitle(event.target.value)}
              disabled={imageUpload.busy}
            />
            <input
              ref={imageInput}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#e8f5c9] file:px-4 file:py-3 file:font-bold"
              type="file"
              accept={IMAGE_UPLOAD_TYPES.join(",")}
              onChange={(event) =>
                setImageFile(event.target.files?.[0] ?? null)
              }
              disabled={imageUpload.busy}
            />
            <button
              className="w-full rounded-xl bg-[#111711] px-5 py-3 font-bold text-white disabled:opacity-45"
              disabled={!imageFile || imageUpload.busy}
            >
              {imageUpload.busy ? "上傳中…" : "上傳圖片"}
            </button>
          </form>
        </UploadCard>

        <UploadCard
          eyebrow="MUX VIDEO"
          title="上傳影片"
          description="影片直接從瀏覽器傳到 Mux；完成後仍需等待雲端轉碼與 webhook。需先在 API 設定 Mux 金鑰。"
          state={videoUpload}
        >
          <form className="mt-6 space-y-4" onSubmit={handleVideoUpload}>
            <input
              className="field-input"
              placeholder="影片名稱（留白會使用檔名）"
              maxLength={120}
              value={videoTitle}
              onChange={(event) => setVideoTitle(event.target.value)}
              disabled={videoUpload.busy}
            />
            <input
              ref={videoInput}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-[#ffe5d9] file:px-4 file:py-3 file:font-bold"
              type="file"
              accept="video/*"
              onChange={(event) =>
                setVideoFile(event.target.files?.[0] ?? null)
              }
              disabled={videoUpload.busy}
            />
            <button
              className="w-full rounded-xl bg-[#ff6b35] px-5 py-3 font-bold text-white disabled:opacity-45"
              disabled={!videoFile || videoUpload.busy}
            >
              {videoUpload.busy ? "上傳中…" : "上傳影片"}
            </button>
          </form>
        </UploadCard>
      </section>

      <MediaLibrary
        assets={assets}
        refreshing={refreshing}
        onRefresh={() => void refreshMedia()}
      />
    </div>
  );
}

function MediaLibrary({
  assets,
  refreshing,
  onRefresh,
}: {
  assets: MediaAsset[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#758650]">
            ASSET LIBRARY
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">
            已建立的媒體 ({assets.length})
          </h2>
        </div>
        <button
          className="rounded-xl border border-[#cbc9bf] bg-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "更新中…" : "重新整理"}
        </button>
      </div>

      {assets.length ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {assets.map((asset) => (
            <article
              key={asset.id}
              className="rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6] p-4 shadow-sm"
            >
              <MediaPreview asset={asset} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-extrabold">{asset.title}</h3>
                  <p className="mt-1 truncate text-xs text-[#777e75]">
                    {asset.originalFileName ?? asset.id}
                  </p>
                </div>
                <MediaStatusBadge status={asset.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#697067]">
                <div>
                  <dt className="font-bold text-[#111711]">類型</dt>
                  <dd>
                    {asset.kind} · {asset.provider}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-[#111711]">大小</dt>
                  <dd>{formatBytes(asset.fileSizeBytes)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#111711]">建立</dt>
                  <dd>{new Date(asset.createdAt).toLocaleString("zh-TW")}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#111711]">資產 ID</dt>
                  <dd className="truncate" title={asset.id}>
                    {asset.id.slice(0, 8)}…
                  </dd>
                </div>
              </dl>
              {asset.errorMessage ? (
                <p className="mt-3 rounded-lg bg-[#fff0eb] p-3 text-xs text-[#a33d1d]">
                  {asset.errorMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="court-grid mt-5 rounded-2xl border border-dashed border-[#c9c7be] py-20 text-center text-sm font-bold text-[#858b82]">
          尚無媒體，請從上方建立第一筆資產。
        </div>
      )}
    </section>
  );
}

function UploadCard({
  eyebrow,
  title,
  description,
  state,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  state: UploadState;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#d8d6cd] bg-[#fbfaf6] p-6 shadow-sm">
      <p className="text-[10px] font-bold tracking-[0.18em] text-[#758650]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#697067]">{description}</p>
      {children}
      {state.progress > 0 ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e3e1d9]">
          <div
            className="h-full rounded-full bg-[#8cc61b] transition-[width]"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      ) : null}
      {state.message ? (
        <p className="mt-3 text-xs font-bold text-[#4f681d]">{state.message}</p>
      ) : null}
      {state.error ? (
        <p className="mt-3 rounded-lg bg-[#fff0eb] p-3 text-xs font-bold text-[#a33d1d]">
          {state.error}
        </p>
      ) : null}
    </article>
  );
}

function MediaStatusBadge({ status }: { status: MediaAsset["status"] }) {
  const presentation: Record<string, { label: string; style: string }> = {
    pending: {
      label: "處理中",
      style: "border-[#e1ca79] bg-[#fff7d8] text-[#806414]",
    },
    ready: {
      label: "可使用",
      style: "border-[#b8dc69] bg-[#effbd4] text-[#496b08]",
    },
    errored: {
      label: "失敗",
      style: "border-[#efb39e] bg-[#fff0e9] text-[#9f3c1a]",
    },
  };
  const value = presentation[status] ?? {
    label: status,
    style: "border-[#c9c7be] bg-[#f1f0eb] text-[#646b62]",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${value.style}`}
    >
      {value.label}
    </span>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.max(3, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("影片上傳網路中斷。"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Mux 上傳失敗（HTTP ${request.status}）。`));
    };
    request.send(file);
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "發生未知錯誤。";
}

function formatBytes(value: number | null) {
  if (value === null) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
