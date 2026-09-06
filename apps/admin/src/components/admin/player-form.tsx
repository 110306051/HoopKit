/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminApiRequest } from "@/lib/admin-api";
import { createClient } from "@/lib/supabase/client";
import {
  IMAGE_UPLOAD_TYPES,
  uploadImageToMediaLibrary,
} from "@/lib/media-upload";
import type { ContentStatus, Player } from "@/types/admin";

const positions = [
  ["point_guard", "控球後衛"],
  ["shooting_guard", "得分後衛"],
  ["small_forward", "小前鋒"],
  ["power_forward", "大前鋒"],
  ["center", "中鋒"],
  ["guard", "後衛"],
  ["forward", "前鋒"],
  ["unknown", "未指定"],
] as const;

type PlayerFormProps = {
  player?: Player;
};

export function PlayerForm({ player }: PlayerFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(player?.fullName ?? "");
  const [shortName, setShortName] = useState(player?.shortName ?? "");
  const [slug, setSlug] = useState(player?.slug ?? "");
  const [bio, setBio] = useState(player?.bio ?? "");
  const [position, setPosition] = useState(player?.position ?? "unknown");
  const [teamName, setTeamName] = useState(player?.teamName ?? "");
  const [nationality, setNationality] = useState(player?.nationality ?? "");
  const [avatarPath, setAvatarPath] = useState(player?.avatarPath ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUpload, setAvatarUpload] = useState({
    busy: false,
    progress: 0,
    message: null as string | null,
    error: null as string | null,
  });
  const [status, setStatus] = useState<ContentStatus>(
    player?.status ?? "draft",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const initials = useMemo(
    () => (fullName.trim().slice(0, 2) || "HK").toUpperCase(),
    [fullName],
  );

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  function selectAvatar(file: File | null) {
    setAvatarFile(file);
    setAvatarUpload({ busy: false, progress: 0, message: null, error: null });
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setAvatarUpload({
      busy: true,
      progress: 0,
      message: "準備上傳…",
      error: null,
    });

    try {
      const asset = await uploadImageToMediaLibrary({
        file: avatarFile,
        title: `${fullName.trim() || "未命名球員"} 頭像`,
        onProgress: (progress, message) =>
          setAvatarUpload({ busy: true, progress, message, error: null }),
      });
      if (!asset.sourceUrl) {
        throw new Error("圖片已上傳，但 API 沒有回傳公開 URL。");
      }

      setAvatarPath(asset.sourceUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
      if (avatarInput.current) avatarInput.current.value = "";
      setAvatarUpload({
        busy: false,
        progress: 100,
        message: "上傳完成；請再按「儲存球員」完成頭像設定。",
        error: null,
      });
    } catch (uploadError) {
      setAvatarUpload({
        busy: false,
        progress: 0,
        message: null,
        error:
          uploadError instanceof Error ? uploadError.message : "圖片上傳失敗。",
      });
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const result = await adminApiRequest<Player>(
      player ? `/admin/players/${player.id}` : "/admin/players",
      session.access_token,
      {
        method: player ? "PUT" : "POST",
        body: JSON.stringify({
          fullName,
          shortName,
          slug,
          bio,
          position,
          teamName,
          nationality,
          avatarPath,
          status,
        }),
      },
    );

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/players");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="editor-form grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <FormSection
          title="基本資料"
          description="建立內容識別、顯示名稱與球員背景。"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="完整名稱" required>
              <input
                required
                maxLength={100}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field-input"
                placeholder="例如：HoopKit Lab Player"
              />
            </Field>
            <Field label="短名稱">
              <input
                maxLength={100}
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                className="field-input"
                placeholder="例如：Lab Player"
              />
            </Field>
            <Field
              label="Slug"
              hint="只允許小寫英文字母、數字與連字號；會用在 URL。"
              required
            >
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                className="field-input font-mono"
                placeholder="hoopkit-lab-player"
              />
            </Field>
            <Field label="場上位置" required>
              <select
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                className="field-input"
              >
                {positions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="目前隊伍">
              <input
                maxLength={100}
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="field-input"
                placeholder="HoopKit Lab"
              />
            </Field>
            <Field label="國籍／地區">
              <input
                maxLength={80}
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
                className="field-input"
                placeholder="TW"
              />
            </Field>
          </div>
          <Field label="球員介紹">
            <textarea
              rows={7}
              maxLength={4000}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="field-input min-h-40 resize-y py-3"
              placeholder="描述球員風格、代表性特色，以及為何值得收錄。"
            />
          </Field>
        </FormSection>

        <FormSection
          title="圖片與發布"
          description="可從電腦上傳至 Supabase Storage，或直接使用既有的公開圖片 URL。"
        >
          <div className="border-l-2 border-[#121212] bg-[#f8f8f6] p-4">
            <p className="text-sm font-bold text-[#30392f]">從電腦上傳頭像</p>
            <p className="mt-1 text-xs leading-5 text-[#858c83]">
              支援 JPG、PNG、WebP、GIF，最大 10
              MB。上傳會先建立媒體資產，再自動填入下方 URL。
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={avatarInput}
                type="file"
                accept={IMAGE_UPLOAD_TYPES.join(",")}
                disabled={avatarUpload.busy}
                onChange={(event) =>
                  selectAvatar(event.target.files?.[0] ?? null)
                }
                className="min-w-0 flex-1 text-sm file:mr-4 file:rounded-md file:border file:border-[#d7d7d0] file:bg-white file:px-4 file:py-3 file:font-bold"
              />
              <button
                type="button"
                disabled={!avatarFile || avatarUpload.busy}
                onClick={() => void uploadAvatar()}
                className="primary-action shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {avatarUpload.busy ? "上傳中…" : "上傳並使用"}
              </button>
            </div>
            {avatarUpload.progress > 0 ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e3e1d9]">
                <div
                  className="h-full rounded-full bg-[#f05a28] transition-[width]"
                  style={{ width: `${avatarUpload.progress}%` }}
                />
              </div>
            ) : null}
            {avatarUpload.message ? (
              <p className="mt-3 text-xs font-bold text-[#4f681d]">
                {avatarUpload.message}
              </p>
            ) : null}
            {avatarUpload.error ? (
              <p className="mt-3 rounded-lg bg-[#fff0eb] p-3 text-xs font-bold text-[#a33d1d]">
                {avatarUpload.error}
              </p>
            ) : null}
          </div>

          <Field
            label="公開圖片 URL"
            hint="進階選項：可直接貼上既有 CDN 或其他公開可讀取的圖片網址。"
          >
            <input
              maxLength={2000}
              value={avatarPath}
              onChange={(event) => setAvatarPath(event.target.value)}
              className="field-input"
              placeholder="https://.../player.jpg（本機上傳後會自動填入）"
            />
          </Field>
          <Field label="內容狀態" required>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ContentStatus)
              }
              className="field-input"
            >
              <option value="draft">草稿：只在 Admin 看得到</option>
              <option value="published">發布：Mobile/API 可公開讀取</option>
              <option value="archived">封存：保留資料但不公開</option>
            </select>
          </Field>
        </FormSection>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
        <div className="border border-[#d7d7d0] bg-white p-5">
          <p className="page-kicker">
            PREVIEW
          </p>
          <div className="mt-4 overflow-hidden bg-[#121212]">
            {avatarPreview || avatarPath ? (
              <img
                src={avatarPreview ?? avatarPath}
                alt="球員頭像預覽"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="court-grid display-type grid aspect-square place-items-center text-6xl font-black text-[#f05a28]">
                {initials}
              </div>
            )}
          </div>
          <h3 className="mt-4 text-xl font-extrabold">
            {fullName || "未命名球員"}
          </h3>
          <p className="mt-1 text-sm text-[#737b71]">
            {positions.find(([value]) => value === position)?.[1] ?? position}
            {teamName ? ` · ${teamName}` : ""}
          </p>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#626a61]">
            {bio || "球員介紹會顯示在這裡。"}
          </p>
        </div>

        {error ? (
          <div
            className="border-l-4 border-[#f05a28] bg-[#fff0e9] p-4 text-sm text-[#873719]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || avatarUpload.busy}
          className="primary-action w-full disabled:cursor-wait disabled:opacity-55"
        >
          {isSubmitting ? "儲存中…" : player ? "儲存球員" : "建立球員"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="secondary-action w-full"
        >
          取消
        </button>
      </aside>
    </form>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#d7d7d0] bg-white p-6 lg:p-8">
      <h2 className="display-type text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm text-[#696964]">{description}</p>
      <div className="mt-7 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#30302d]">
        {label} {required ? <span className="text-[#f05a28]">*</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="mt-2 block text-xs leading-5 text-[#858c83]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
